// @ts-nocheck
import { useRef, useCallback } from "react"
import DOMPurify from "dompurify"
import { Bold, Italic } from "lucide-react"
import { Button } from "@ui/button"

interface RichTextEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  minHeight?: string
}

export function RichTextEditor({ value, onChange, placeholder, minHeight = "200px" }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null)
  const sanitizeHtml = useCallback((html: string) => DOMPurify.sanitize(html), [])
  const syncValue = useCallback(() => {
    if (editorRef.current) {
      onChange(sanitizeHtml(editorRef.current.innerHTML))
    }
  }, [onChange, sanitizeHtml])

  const execCommand = useCallback((command: string) => {
    document.execCommand(command, false)
    syncValue()
  }, [syncValue])

  const handleInput = useCallback(() => {
    syncValue()
  }, [syncValue])

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
      <div className="flex items-center gap-1 px-2 py-1.5 border-b bg-muted/30">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => execCommand("bold")}
          title="Negrito"
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0"
          onClick={() => execCommand("italic")}
          title="Itálico"
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div
        ref={editorRef}
        contentEditable
        className="p-3 text-sm leading-relaxed focus:outline-none text-foreground"
        style={{ minHeight }}
        onInput={handleInput}
        data-placeholder={placeholder}
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(value) }}
        suppressContentEditableWarning
      />
      <style>{`
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: hsl(var(--muted-foreground));
          pointer-events: none;
        }
      `}</style>
    </div>
  )
}
