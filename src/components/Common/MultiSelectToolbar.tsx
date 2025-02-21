import { Button } from "@nextui-org/react";
import { Icon } from "@iconify/react";

interface Action {
  icon: string;
  text: string;
  isDeleteButton?: boolean;
  onClick: () => void;
}

interface MultiSelectToolbarProps {
  show: boolean;
  actions: Action[];
  onClose: () => void;
}

export const MultiSelectToolbar = ({ show, actions, onClose }: MultiSelectToolbarProps) => {
  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-content1 rounded-2xl shadow-lg px-4 py-2 flex items-center gap-2 border-2 border-primary">
        {actions.map((action, index) => (
          <Button
            key={index}
            size="md"
            color={action.isDeleteButton ? "danger" : "default"}
            variant="light"
            startContent={<Icon icon={action.icon} />}
            onPress={action.onClick}
          >
            {action.text}
          </Button>
        ))}
        <Button
          className="w-[32px]! h-[32px]! min-w-0!"
          size="md"
          variant="light"
          isIconOnly
          startContent={<Icon icon="material-symbols:close" />}
          onPress={onClose}
        />
      </div>
    </div>
  );
}; 