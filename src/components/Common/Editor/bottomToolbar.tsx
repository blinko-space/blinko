import { Icon } from "@iconify/react";
import { Button, Tooltip } from "@nextui-org/react";

interface ToolbarItem {
  icon: string | React.ReactNode;
  tooltipContent: string;
  show?: boolean;
  onClick: () => void;
  slot?: React.ReactNode;
}

interface BottomToolbarProps {
  items: ToolbarItem[];
}

export const BottomToolbar: React.FC<BottomToolbarProps> = ({ items }) => {
  return (
    <div className="bottom-toolbar flex items-center gap-1">
      {items.map((item, index) => (
        item.show !== false && (
          <Tooltip key={index} content={item.tooltipContent} placement="bottom">
            <div className="flex items-center justify-center hover:bg-hover p-1 cursor-pointer rounded-md transition-all"  onClick={item.onClick}>
              {item.slot}
              {
                typeof item.icon == 'string' ? <Icon icon={item.icon} className='hover:opacity-80 transition-all' width={20} height={20} /> : item.icon
              }
            </div>
          </Tooltip>
        )
      ))}
    </div>
  );
};
