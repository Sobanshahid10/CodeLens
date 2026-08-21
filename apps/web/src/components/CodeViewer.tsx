import React, { useEffect, useRef } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useRepoStore } from '../stores/repoStore';
import { FileCode, Sparkles } from 'lucide-react';

export const CodeViewer: React.FC = () => {
  const selectedFile = useRepoStore((state) => state.selectedFile);
  const selectedFileContent = useRepoStore((state) => state.selectedFileContent);
  const selectedCitation = useRepoStore((state) => state.selectedCitation);

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  // Detect Monaco language mode from file extension
  const getLanguage = (filePath: string | null): string => {
    if (!filePath) return 'python';
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'py':
        return 'python';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'go':
        return 'go';
      case 'rs':
        return 'rust';
      case 'java':
        return 'java';
      case 'json':
        return 'json';
      case 'md':
        return 'markdown';
      case 'yaml':
      case 'yml':
        return 'yaml';
      case 'sql':
        return 'sql';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      default:
        return 'plaintext';
    }
  };

  // Provide realistic initial / fallback code if no backend file fetch yet
  const getCodeContent = (): string => {
    if (selectedFileContent) return selectedFileContent;
    if (selectedCitation?.snippet) {
      return (
        `# File: ${selectedFile || 'retrieved_context.py'}\n` +
        `# Lines ${selectedCitation.startLine}-${selectedCitation.endLine}\n\n` +
        selectedCitation.snippet
      );
    }
    if (!selectedFile) {
      return (
        `"""\n` +
        `CodeLens AI Workspace\n` +
        `Select a file from the repository tree or click a citation in the chat panel.\n` +
        `"""\n\n` +
        `def welcome_to_codelens():\n` +
        `    return "Explore your codebase with full AST intelligence and citations."\n`
      );
    }
    return (
      `# ${selectedFile}\n\n` +
      `import os\n` +
      `from typing import Any\n\n` +
      `def main() -> None:\n` +
      `    print("Viewing: ${selectedFile}")\n`
    );
  };

  const handleEditorDidMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;

    // Define custom Monaco theme matching our dark design palette
    monaco.editor.defineTheme('codelens-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '64748b', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'f59e0b' },
        { token: 'function', foreground: '38bdf8' },
      ],
      colors: {
        'editor.background': '#0a0d14',
        'editor.foreground': '#e2e8f0',
        'editor.lineHighlightBackground': '#161d2f',
        'editorCursor.foreground': '#6366f1',
        'editorWhitespace.foreground': '#1e293b',
        'editorIndentGuide.background': '#1e293b',
        'editorIndentGuide.activeBackground': '#334155',
        'editorLineNumber.foreground': '#475569',
        'editorLineNumber.activeForeground': '#94a3b8',
      },
    });
    monaco.editor.setTheme('codelens-dark');

    applyCitationDecoration();
  };

  const applyCitationDecoration = () => {
    const editorInstance = editorRef.current;
    const monaco = monacoRef.current;
    if (!editorInstance || !monaco) return;

    if (selectedCitation && selectedCitation.startLine && selectedCitation.endLine) {
      const { startLine, endLine } = selectedCitation;

      // Highlight target lines with #1c4a1c background and green border
      const newDecorations: editor.IModelDeltaDecoration[] = [
        {
          range: new monaco.Range(startLine, 1, endLine, 1),
          options: {
            isWholeLine: true,
            className: 'monaco-citation-highlight',
            glyphMarginClassName: 'monaco-citation-glyph',
            linesDecorationsClassName: 'monaco-citation-glyph',
          },
        },
      ];

      decorationsRef.current = editorInstance.deltaDecorations(
        decorationsRef.current,
        newDecorations
      );

      // Smooth scroll to the cited line in the center of the editor
      editorInstance.revealLineInCenter(startLine);
    } else {
      // Clear decorations if no active citation
      decorationsRef.current = editorInstance.deltaDecorations(decorationsRef.current, []);
    }
  };

  useEffect(() => {
    applyCitationDecoration();
  }, [selectedCitation, selectedFile]);

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0d14] overflow-hidden">
      {/* File Header Bar & Citation Indicator */}
      <div className="h-9 px-4 bg-[#0f1422] border-b border-white/5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-300 truncate">
          <FileCode size={14} className="text-indigo-400 shrink-0" />
          <span className="truncate">{selectedFile || 'No file selected'}</span>
        </div>

        {selectedCitation && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-500/40 text-[11px] font-mono text-emerald-300 animate-fade-in">
            <Sparkles size={11} className="text-emerald-400" />
            <span>
              Cited Lines: {selectedCitation.startLine}–{selectedCitation.endLine}
            </span>
          </div>
        )}
      </div>

      {/* Monaco Editor Container */}
      <div className="flex-1 w-full overflow-hidden">
        <Editor
          height="100%"
          language={getLanguage(selectedFile)}
          value={getCodeContent()}
          theme="codelens-dark"
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            minimap: { enabled: true },
            fontSize: 13,
            lineHeight: 20,
            fontFamily: "'Fira Code', monospace",
            fontLigatures: true,
            scrollBeyondLastLine: false,
            smoothScrolling: true,
            cursorBlinking: 'smooth',
            lineNumbersMinChars: 3,
            glyphMargin: true,
            renderLineHighlight: 'all',
          }}
        />
      </div>
    </div>
  );
};
