import { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Underline, List, ListOrdered, AlignLeft, AlignCenter, AlignRight, Quote, Code, Link, Image, Undo, Redo, Strikethrough, X } from 'lucide-react';

interface RichTextEditorProps {
    value: string;
    onChange: (nextValue: string) => void;
    placeholder?: string;
    className?: string;
}

const toolbarButtons = [
    { command: 'undo', icon: Undo, label: 'Undo' },
    { command: 'redo', icon: Redo, label: 'Redo' },
    { divider: true },
    { command: 'bold', icon: Bold, label: 'Bold' },
    { command: 'italic', icon: Italic, label: 'Italic' },
    { command: 'underline', icon: Underline, label: 'Underline' },
    { command: 'strikeThrough', icon: Strikethrough, label: 'Strikethrough' },
    { divider: true },
    { command: 'justifyLeft', icon: AlignLeft, label: 'Align left' },
    { command: 'justifyCenter', icon: AlignCenter, label: 'Align center' },
    { command: 'justifyRight', icon: AlignRight, label: 'Align right' },
    { divider: true },
    { command: 'insertUnorderedList', icon: List, label: 'Bulleted list' },
    { command: 'insertOrderedList', icon: ListOrdered, label: 'Numbered list' },
    { command: 'formatBlock', value: 'blockquote', icon: Quote, label: 'Quote', key: 'formatBlock-quote' },
    { command: 'formatBlock', value: 'pre', icon: Code, label: 'Code block', key: 'formatBlock-code' },
    { divider: true },
    { command: 'createLink', icon: Link, label: 'Insert link' },
    { command: 'insertImage', icon: Image, label: 'Insert image' },
];

export default function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
    const editorRef = useRef<HTMLDivElement>(null);
    const [isFocused, setIsFocused] = useState(false);
    const [showLinkModal, setShowLinkModal] = useState(false);
    const [showImageModal, setShowImageModal] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    useEffect(() => {
        if (!editorRef.current) return;
        if (editorRef.current.innerHTML === value) return;

        editorRef.current.innerHTML = value || '';
    }, [value]);

    const handleInput = () => {
        if (!editorRef.current) return;
        onChange(editorRef.current.innerHTML);
    };

    const applyCommand = (command: string, value?: string) => {
        editorRef.current?.focus();

        if (command === 'createLink') {
            setShowLinkModal(true);
        } else if (command === 'insertImage') {
            setShowImageModal(true);
        } else if (command === 'formatBlock' && value) {
            // eslint-disable-next-line deprecated
            document.execCommand(command, false, value);
        } else {
            // eslint-disable-next-line deprecated
            document.execCommand(command);
        }
        handleInput();
    };

    const handleLinkModalClose = () => {
        setShowLinkModal(false);
    };

    const handleImageModalClose = () => {
        setShowImageModal(false);
    };

    const handleLinkInsert = () => {
        // eslint-disable-next-line deprecated
        document.execCommand('createLink', false, linkUrl);
        setShowLinkModal(false);
        handleInput();
    };

    const handleImageInsert = () => {
        // eslint-disable-next-line deprecated
        document.execCommand('insertImage', false, imageUrl);
        setShowImageModal(false);
        handleInput();
    };

    return (
        <div className={`rounded-lg border border-gray-600 bg-gray-800 ${className ?? ''}`}>
            <div className="flex flex-wrap items-center gap-1 border-b border-gray-700 px-2 py-2 text-gray-300">
                {toolbarButtons.map((button, index) => {
                    if ('divider' in button) {
                        return (
                            <div key={`divider-${index}`} className="h-6 w-px bg-gray-600 mx-1" />
                        );
                    }

                    const { command, icon: Icon, label, value: cmdValue, key: buttonKey } = button;
                    return (
                        <button
                            key={buttonKey || command}
                            type="button"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => applyCommand(command, cmdValue)}
                            aria-label={label}
                            title={label}
                        >
                            <Icon className="h-4 w-4" />
                        </button>
                    );
                })}
            </div>
            <div
                ref={editorRef}
                className="min-h-[200px] overflow-y-auto px-4 py-3 text-base text-white focus:outline-none"
                contentEditable
                role="textbox"
                aria-multiline="true"
                onInput={handleInput}
                onBlur={() => setIsFocused(false)}
                onFocus={() => setIsFocused(true)}
                data-placeholder={placeholder}
                style={{
                    minHeight: '200px',
                    lineHeight: '1.6',
                }}
            />
            {!isFocused && !value && (
                <div className="pointer-events-none -mt-[200px] px-4 py-3 text-sm text-gray-500">
                    {placeholder}
                </div>
            )}
            {showLinkModal && (
                <div className="fixed top-0 left-0 z-10 flex h-screen w-screen items-center justify-center bg-gray-900 bg-opacity-50">
                    <div className="rounded-lg bg-gray-800 p-4">
                        <h2 className="mb-2 text-lg">Insert Link</h2>
                        <input
                            type="text"
                            value={linkUrl}
                            onChange={(event) => setLinkUrl(event.target.value)}
                            className="mb-2 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-white"
                            placeholder="Enter link URL"
                        />
                        <button
                            type="button"
                            className="mr-2 rounded-lg bg-blue-500 py-2 px-4 text-white hover:bg-blue-600"
                            onClick={handleLinkInsert}
                        >
                            Insert
                        </button>
                        <button
                            type="button"
                            className="rounded-lg bg-gray-600 py-2 px-4 text-white hover:bg-gray-700"
                            onClick={handleLinkModalClose}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
            {showImageModal && (
                <div className="fixed top-0 left-0 z-10 flex h-screen w-screen items-center justify-center bg-gray-900 bg-opacity-50">
                    <div className="rounded-lg bg-gray-800 p-4">
                        <h2 className="mb-2 text-lg">Insert Image</h2>
                        <input
                            type="text"
                            value={imageUrl}
                            onChange={(event) => setImageUrl(event.target.value)}
                            className="mb-2 block w-full rounded-lg border border-gray-600 bg-gray-700 p-2 text-white"
                            placeholder="Enter image URL"
                        />
                        <button
                            type="button"
                            className="mr-2 rounded-lg bg-blue-500 py-2 px-4 text-white hover:bg-blue-600"
                            onClick={handleImageInsert}
                        >
                            Insert
                        </button>
                        <button
                            type="button"
                            className="rounded-lg bg-gray-600 py-2 px-4 text-white hover:bg-gray-700"
                            onClick={handleImageModalClose}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
