import { _ } from '@/lib/lodash';
import "pdf-parse";
import { ChatOpenAI, ClientOptions, OpenAIEmbeddings, } from "@langchain/openai";
import path from 'path';
import fs from 'fs';
import type { Document } from "@langchain/core/documents";
import { AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages';
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { StringOutputParser } from '@langchain/core/output_parsers';
import { OpenAIWhisperAudio } from "@langchain/community/document_loaders/fs/openai_whisper_audio";
import { prisma } from '../prisma';
import { FAISS_PATH, UPLOAD_FILE_PATH } from '@/lib/constant';
import { AiModelFactory } from './ai/aiModelFactory';
import { ProgressResult } from './memos';
import { PDFLoader } from "@langchain/community/document_loaders/fs/pdf";
import { DocxLoader } from "@langchain/community/document_loaders/fs/docx";
import { CSVLoader } from "@langchain/community/document_loaders/fs/csv";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { UnstructuredLoader } from "@langchain/community/document_loaders/fs/unstructured";
import { FaissStore } from '@langchain/community/vectorstores/faiss';
import { BaseDocumentLoader } from '@langchain/core/document_loaders/base';
import { FileService } from './files';
import { AiPrompt } from './ai/aiPrompt';
import { Context } from '../context';
import dayjs from 'dayjs';
import { CreateNotification } from '../routers/notification';
import { NotificationType } from '@/lib/prismaZodType';

//https://js.langchain.com/docs/introduction/
//https://smith.langchain.com/onboarding
//https://js.langchain.com/docs/tutorials/qa_chat_history
const FaissStorePath = path.join(FAISS_PATH);

export class AiService {
  static async loadFileContent(filePath: string): Promise<string> {
    try {
      let loader: BaseDocumentLoader;
      switch (true) {
        case filePath.endsWith('.pdf'):
          loader = new PDFLoader(filePath);
          break;
        case filePath.endsWith('.docx') || filePath.endsWith('.doc'):
          loader = new DocxLoader(filePath);
          break;
        case filePath.endsWith('.txt'):
          loader = new TextLoader(filePath);
          break;
        case filePath.endsWith('.csv'):
          console.log('load csv')
          loader = new CSVLoader(filePath);
          break;
        default:
          loader = new UnstructuredLoader(filePath);
      }
      const docs = await loader.load();
      return docs.map(doc => doc.pageContent).join('\n');
    } catch (error) {
      console.error('File loading error:', error);
      throw new Error(`can not load file: ${filePath}`);
    }
  }

  static async embeddingDeleteAll(id: number, VectorStore: FaissStore) {
    for (const index of new Array(9999).keys()) {
      try {
        await VectorStore.delete({ ids: [`${id}-${index}`] })
        await VectorStore.save(FaissStorePath)
      } catch (error) {
        console.log('error', error)
        break;
      }
    }
  }

  static async embeddingDeleteAllAttachments(filePath: string, VectorStore: FaissStore) {
    for (const index of new Array(9999).keys()) {
      try {
        await VectorStore.delete({ ids: [`${filePath}-${index}`] })
        await VectorStore.save(FaissStorePath)
      } catch (error) {
        break;
      }
    }
  }

  static async embeddingUpsert({ id, content, type, createTime, updatedAt }: { id: number, content: string, type: 'update' | 'insert', createTime: Date, updatedAt?: Date }) {
    try {
      const { VectorStore, MarkdownSplitter } = await AiModelFactory.GetProvider()
      const config = await AiModelFactory.globalConfig()
      if (config.excludeEmbeddingTagId) {
        const tag = await prisma.tag.findUnique({ where: { id: config.excludeEmbeddingTagId } })
        if (tag && content.includes(tag.name)) {
          console.warn('this note is not allowed to be embedded:', tag.name)
          return { ok: true, msg: 'tag is not allowed to be embedded' }
        }
      }

      const chunks = await MarkdownSplitter.splitText(content);
      if (type == 'update') {
        await AiService.embeddingDeleteAll(id, VectorStore)
      }
      const documents: Document[] = chunks.map((chunk, index) => {
        return {
          pageContent: chunk + `\n\nCreated At: ${dayjs(createTime).format('YYYY-MM-DD HH:mm:ss')}`,
          metadata: { noteId: id, uniqDocId: `${id}-${index}`, id: `${id}-${index}` },
        }
      })
      try {
        await prisma.notes.update({
          where: { id },
          data: {
            metadata: {
              isIndexed: true
            },
            updatedAt,
          },
        
        })
      } catch (error) {
        console.log(error)
      }
      const BATCH_SIZE = 5;
      for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE);
        const batchIds = batch.map(doc => doc.metadata.uniqDocId);
        await VectorStore.addDocuments(batch, { ids: batchIds });
      }
      await VectorStore.save(FaissStorePath)
      return { ok: true }
    } catch (error) {
      return { ok: false, error: error?.message }
    }
  }

  //api/file/123.pdf
  static async embeddingInsertAttachments({ id, updatedAt, filePath }: { id: number, updatedAt?: Date, filePath: string }) {
    try {
      // const note = await prisma.notes.findUnique({ where: { id } })
      // //@ts-ignore
      // if (note?.metadata?.isAttachmentsIndexed) {
      //   return { ok: true, msg: 'already indexed' }
      // }
      const absolutePath = await FileService.getFile(filePath)
      const content = await AiService.loadFileContent(absolutePath);
      const { VectorStore, TokenTextSplitter } = await AiModelFactory.GetProvider()
      const chunks = await TokenTextSplitter.splitText(content);
      const documents: Document[] = chunks.map((chunk, index) => {
        return {
          pageContent: chunk,
          metadata: {
            noteId: id,
            uniqDocId: `${filePath}-${index}`
          },
        }
      })

      try {
        await prisma.notes.update({
          where: { id },
          data: {
            metadata: {
              isIndexed: true,
              isAttachmentsIndexed: true
            },
            updatedAt
          }
        })
      } catch (error) {
        console.log(error)
      }

      const BATCH_SIZE = 5;
      for (let i = 0; i < documents.length; i += BATCH_SIZE) {
        const batch = documents.slice(i, i + BATCH_SIZE);
        const batchIds = batch.map(doc => doc.metadata.uniqDocId);
        await VectorStore.addDocuments(batch, { ids: batchIds });
      }

      await VectorStore.save(FaissStorePath)
      return { ok: true }
    } catch (error) {
      return { ok: false, error }
    }
  }



  static async embeddingDelete({ id }: { id: number }) {
    const { VectorStore } = await AiModelFactory.GetProvider()
    await AiService.embeddingDeleteAll(id, VectorStore)
    const attachments = await prisma.attachments.findMany({ where: { noteId: id } })
    for (const attachment of attachments) {
      await AiService.embeddingDeleteAllAttachments(attachment.path, VectorStore)
    }
    return { ok: true }
  }

  static async similaritySearch({ question }: { question: string }) {
    const { VectorStore, } = await AiModelFactory.GetProvider()
    const config = await AiModelFactory.globalConfig()
    const topK = config.embeddingTopK ?? 2
    const lambda = config.embeddingLambda ?? 0.5
    const score = config.embeddingScore ?? 1.5
    const results = await VectorStore.similaritySearchWithScore(question, topK, {
      fetchK: topK * 3,
      lambda: lambda
    });
    const DISTANCE_THRESHOLD = score;
    const filteredResults = results
      .filter(([doc, distance]) => distance < DISTANCE_THRESHOLD)
      .map(([doc]) => doc);
    return filteredResults;
  }

  static async *rebuildEmbeddingIndex({ force = false }: { force?: boolean }): AsyncGenerator<ProgressResult & { progress?: { current: number, total: number } }, void, unknown> {
    if (force) {
      const faissPath = path.join(FAISS_PATH)
      fs.rmSync(faissPath, { recursive: true, force: true })
    }
    const notes = await prisma.notes.findMany({
      include: {
        attachments: true
      },
      where: {
        isRecycle: false
      }
    });
    const total = notes.length;
    const BATCH_SIZE = 5;

    let current = 0;

    for (let i = 0; i < notes.length; i += BATCH_SIZE) {
      const noteBatch = notes.slice(i, i + BATCH_SIZE);
      for (const note of noteBatch) {
        current++;
        try {
          //@ts-ignore
          if (note.metadata?.isIndexed && !force) {
            yield {
              type: 'skip' as const,
              content: note.content.slice(0, 30),
              progress: { current, total }
            };
            continue;
          }
          if (note?.content != '') {
            const { ok, error } = await AiService.embeddingUpsert({
              createTime: note.createdAt,
              updatedAt: note.updatedAt,
              id: note?.id,
              content: note?.content,
              type: 'update' as const
            });
            if (ok) {
              yield {
                type: 'success' as const,
                content: note?.content.slice(0, 30) ?? '',
                progress: { current, total }
              };
            } else {
              yield {
                type: 'error' as const,
                content: note?.content.slice(0, 30) ?? '',
                error,
                progress: { current, total }
              };
            }
          }
          if (note?.attachments) {
            for (const attachment of note.attachments) {
              const { ok, error } = await AiService.embeddingInsertAttachments({
                id: note.id,
                updatedAt: note.updatedAt,
                filePath: attachment?.path
              });
              if (ok) {
                yield {
                  type: 'success' as const,
                  content: decodeURIComponent(attachment?.path),
                  progress: { current, total }
                };
              } else {
                yield {
                  type: 'error' as const,
                  content: decodeURIComponent(attachment?.path),
                  error,
                  progress: { current, total }
                };
              }
            }
          }

        } catch (error) {
          yield {
            type: 'error' as const,
            content: note.content.slice(0, 30),
            error,
            progress: { current, total }
          };
        }
      }
    }
  }


  static getChatHistory({ conversations }: { conversations: { role: string, content: string }[] }) {
    const conversationMessage = conversations.map(i => {
      if (i.role == 'user') {
        return new HumanMessage(i.content)
      }
      return new AIMessage(i.content)
    })
    conversationMessage.pop()
    return conversationMessage
  }

  static async enhanceQuery({ query, ctx }: { query: string, ctx: Context }) {
    const { VectorStore } = await AiModelFactory.GetProvider()
    const config = await AiModelFactory.globalConfig()
    const results = await VectorStore.similaritySearchWithScore(query, 20);
    const DISTANCE_THRESHOLD = config.embeddingScore ?? 1.5
    const filteredResultsWithScore = results
      .filter(([doc, distance]) => distance < DISTANCE_THRESHOLD)
      .sort(([, distanceA], [, distanceB]) => distanceA - distanceB)
      .map(([doc, distance]) => ({
        doc,
        distance
      }));
    console.log(filteredResultsWithScore)
    const notes = await prisma.notes.findMany({
      where: {
        id: { in: filteredResultsWithScore.map(i => i.doc.metadata?.noteId).filter(i => !!i) },
        accountId: Number(ctx.id)
      },
      include: {
        tags: { include: { tag: true } },
        attachments: true,
        _count: {
          select: {
            comments: true
          }
        }
      }
    })
    const sortedNotes = notes.sort((a, b) => {
      const scoreA = filteredResultsWithScore.find(r => r.doc.metadata?.noteId === a.id)?.distance ?? Infinity;
      const scoreB = filteredResultsWithScore.find(r => r.doc.metadata?.noteId === b.id)?.distance ?? Infinity;
      return scoreA - scoreB;
    });

    return sortedNotes;
  }

  static async completions({ question, conversations, ctx }: { question: string, conversations: { role: string, content: string }[], ctx: Context }) {
    try {
      const { LLM } = await AiModelFactory.GetProvider()
      let searchRes = await AiService.similaritySearch({ question })
      console.log('searchRes', searchRes)
      let notes: any[] = []
      if (searchRes && searchRes.length != 0) {
        notes = await prisma.notes.findMany({
          where: {
            accountId: Number(ctx.id),
            id: {
              in: _.uniqWith(searchRes.map(i => i.metadata?.noteId)).filter(i => !!i) as number[]
            }
          },
          include: {
            attachments: true
          }
        })
      }
      notes = notes?.map(i => { return { ...i, index: searchRes.findIndex(t => t.metadata.noteId == i.id) } }) ?? []
      //@ts-ignore
      notes.sort((a, b) => a.index! - b.index!)
      const chat_history = AiService.getChatHistory({ conversations })
      const qaPrompt = AiPrompt.QAPrompt()
      const qaChain = qaPrompt.pipe(LLM).pipe(new StringOutputParser())
      const context = searchRes.map(doc => doc.pageContent).join('\n\n');
      const result = await qaChain.stream({
        chat_history,
        input: question,
        context: context
      })
      return { result, notes }
    } catch (error) {
      console.log(error)
      throw new Error(error)
    }
  }

  static async autoTag({ content, tags }: { content: string, tags: string[] }) {
    try {
      const { LLM } = await AiModelFactory.GetProvider();
      const autoTagPrompt = AiPrompt.AutoTagPrompt(tags);
      const autoTagChain = autoTagPrompt.pipe(LLM).pipe(new StringOutputParser());

      const result = await autoTagChain.invoke({
        question: "Please select and suggest appropriate tags for the above content",
        context: content
      });

      return result.trim().split(',').map(tag => tag.trim()).filter(Boolean);
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  static async autoEmoji({ content }: { content: string }) {
    try {
      const { LLM } = await AiModelFactory.GetProvider();
      const autoTagPrompt = AiPrompt.AutoEmojiPrompt();
      const autoTagChain = autoTagPrompt.pipe(LLM).pipe(new StringOutputParser());

      const result = await autoTagChain.invoke({
        question: "Please select and suggest appropriate emojis for the above content",
        context: content
      });

      return result.trim().split(',').map(tag => tag.trim()).filter(Boolean);
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  static async writing({
    question,
    type = 'custom',
    content
  }: {
    question: string,
    type?: 'expand' | 'polish' | 'custom',
    content?: string
  }) {
    try {
      const { LLM } = await AiModelFactory.GetProvider();
      const writingPrompt = AiPrompt.WritingPrompt(type, content);
      const writingChain = writingPrompt.pipe(LLM).pipe(new StringOutputParser());

      const result = await writingChain.stream({
        question,
        content: content || ''
      });

      return { result };
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }

  static async speechToText(audioPath: string) {
    const loader = await AiModelFactory.GetAudioLoader(audioPath)
    const docs = await loader.load();
    return docs
  }

  static async AIComment({ content, noteId }: { content: string, noteId: number }) {
    try {
      const note = await prisma.notes.findUnique({
        where: { id: noteId },
        select: { content: true, accountId: true }
      })

      if (!note) {
        throw new Error('Note not found')
      }

      const { LLM } = await AiModelFactory.GetProvider();
      const commentPrompt = AiPrompt.CommentPrompt();
      const commentChain = commentPrompt.pipe(LLM).pipe(new StringOutputParser());
      const aiResponse = await commentChain.invoke({
        content,
        noteContent: note.content
      });

      const comment = await prisma.comments.create({
        data: {
          content: aiResponse.trim(),
          noteId,
          guestName: 'Blinko AI',
          guestIP: '',
          guestUA: ''
        },
        include: {
          account: {
            select: {
              id: true,
              name: true,
              nickname: true,
              image: true
            }
          }
        }
      });
      await CreateNotification({
        accountId: note.accountId ?? 0,
        title: 'comment-notification',
        content: 'comment-notification',
        type: NotificationType.COMMENT,
      })
      return comment;
    } catch (error) {
      console.log(error);
      throw new Error(error);
    }
  }
}