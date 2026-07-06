import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Smile } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";

interface ChatEmojiPickerProps {
  onSelect: (emoji: string) => void;
  disabled?: boolean;
}

export function ChatEmojiPicker({ onSelect, disabled }: ChatEmojiPickerProps) {
  const [open, setOpen] = useState(false);

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    onSelect(emojiData.emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          disabled={disabled}
          className="h-9 w-9 shrink-0"
        >
          <Smile className="h-5 w-5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="top" 
        align="start" 
        className="w-auto p-0 border-0 shadow-lg"
        sideOffset={8}
      >
        <EmojiPicker
          onEmojiClick={handleEmojiClick}
          theme={Theme.AUTO}
          width={320}
          height={400}
          searchPlaceHolder="Buscar emoji..."
          previewConfig={{ showPreview: false }}
          skinTonesDisabled
          lazyLoadEmojis
        />
      </PopoverContent>
    </Popover>
  );
}
