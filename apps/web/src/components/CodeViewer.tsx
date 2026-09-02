import React, { useEffect, useRef, useState } from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import type { editor } from 'monaco-editor';
import { useRepoStore } from '../stores/repoStore';
import { Check, Copy, FileCode, Maximize2, Minimize2, X } from 'lucide-react';
import { useToast } from '../hooks/useToast';

/* ──────────────────────────────────────────────
   Tab management types
────────────────────────────────────────────── */
interface FileTab {
  path: string;
  label: string;
}

/* ──────────────────────────────────────────────
   Demo source previews
────────────────────────────────────────────── */
const REAL_SOURCE_PREVIEWS: Record<string, string> = {
  'apps/api/app/main.py': `from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apps.api.app.routes import auth, repos, chat, search
from apps.api.app.config import settings

app = FastAPI(
    title="CodeLens API",
    description="AI-native codebase intelligence, AST parsing, and hybrid RAG",
    version="2.0.0",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router, prefix="/auth", tags=["auth"])
app.include_router(repos.router, prefix="/api/v1/repos", tags=["repos"])
app.include_router(chat.router, prefix="/api/v1/repos", tags=["chat"])
app.include_router(search.router, prefix="/api/v1/repos", tags=["search"])

@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.ENVIRONMENT, "vector_engine": "Qdrant"}
`,
  'apps/api/app/routes/search.py': `from fastapi import APIRouter, Depends, Query
from apps.api.app.services.retrieval import HybridSearchEngine
from packages.llm_gateway.src.router import get_provider

router = APIRouter()

@router.get("/{repo_id}/search")
async def search_code(
    repo_id: str,
    q: str = Query(..., description="Natural language or identifier query"),
    limit: int = 10,
):
    """Execute hybrid vector + BM25 keyword code retrieval with RRF ranking."""
    provider = get_provider()
    engine = HybridSearchEngine(provider=provider)
    hits = await engine.search(query=q, repo_id=repo_id, top_k=limit)
    return {"query": q, "total_hits": len(hits), "results": hits}
`,
  'apps/api/app/config.py': `from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    ENVIRONMENT: str = "development"
    DATABASE_URL: str = "postgresql://codelens:password@localhost:5432/codelens"
    REDIS_URL: str = "redis://:password@localhost:6379/0"
    QDRANT_URL: str = "http://localhost:6333"
    QDRANT_API_KEY: str | None = None
    JWT_SECRET: str = "super_secret_jwt_key_at_least_32_characters_long"
    LLM_PROVIDER: str = "gemini"
    GOOGLE_API_KEY: str | None = None

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

settings = Settings()
`,
  'packages/llm_gateway/src/providers/gemini_provider.py': `import os
import google.generativeai as genai
from packages.llm_gateway.src.providers.base import BaseLLMProvider, ChatChunk, EmbeddingResult

class GeminiProvider(BaseLLMProvider):
    def __init__(self, api_key: str | None = None):
        self._api_key = api_key or os.environ.get("GOOGLE_API_KEY")
        if self._api_key:
            genai.configure(api_key=self._api_key)

    @property
    def embedding_dimensions(self) -> int:
        return 3072

    @property
    def chat_model_name(self) -> str:
        return "gemini-3.6-flash"

    async def chat_stream(self, messages: list[dict], system_prompt: str):
        model = genai.GenerativeModel(self.chat_model_name, system_instruction=system_prompt)
        response = await model.generate_content_async(messages, stream=True)
        async for chunk in response:
            if chunk.text:
                yield ChatChunk(content=chunk.text)
`,
};

/* ──────────────────────────────────────────────
   Language detection
────────────────────────────────────────────── */
const getLanguage = (filePath: string | null): string => {
  if (!filePath) return 'python';
  const ext = filePath.split('.').pop()?.toLowerCase();
  const map: Record<string, string> = {
    py: 'python', ts: 'typescript', tsx: 'typescript',
    js: 'javascript', jsx: 'javascript', go: 'go', rs: 'rust',
    json: 'json', md: 'markdown', yaml: 'yaml', yml: 'yaml',
    sql: 'sql', toml: 'ini', sh: 'shell', dockerfile: 'dockerfile',
  };
  return map[ext ?? ''] ?? 'plaintext';
};

/* ──────────────────────────────────────────────
   Main component
────────────────────────────────────────────── */
export const CodeViewer: React.FC = () => {
  const selectedFile = useRepoStore((s) => s.selectedFile);
  const selectedFileContent = useRepoStore((s) => s.selectedFileContent);
  const selectedCitation = useRepoStore((s) => s.selectedCitation);
  const clearCitationHighlight = useRepoStore((s) => s.clearCitationHighlight);
  const selectFile = useRepoStore((s) => s.selectFile);

  const toast = useToast();

  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<any>(null);
  const decorationsRef = useRef<string[]>([]);

  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Tab management
  const [tabs, setTabs] = useState<FileTab[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // When a new file is selected, add/activate its tab
  useEffect(() => {
    if (!selectedFile) return;
    const label = selectedFile.split('/').pop() || selectedFile;
    setTabs((prev) => {
      if (prev.find((t) => t.path === selectedFile)) return prev;
      return [...prev, { path: selectedFile, label }];
    });
    setActiveTab(selectedFile);
  }, [selectedFile]);

  const closeTab = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setTabs((prev) => {
      const next = prev.filter((t) => t.path !== path);
      if (activeTab === path) {
        const idx = prev.findIndex((t) => t.path === path);
        const fallback = next[idx] ?? next[idx - 1] ?? null;
        if (fallback) {
          selectFile(fallback.path);
          setActiveTab(fallback.path);
        } else {
          setActiveTab(null);
        }
      }
      return next;
    });
  };

  const switchTab = (path: string) => {
    selectFile(path);
    setActiveTab(path);
  };

  /* Code content resolution */
  const getCodeContent = (): string => {
    const file = activeTab ?? selectedFile;
    if (selectedFileContent) return selectedFileContent;
    if (file && REAL_SOURCE_PREVIEWS[file]) return REAL_SOURCE_PREVIEWS[file];
    if (selectedCitation?.snippet) {
      return (
        `# File: ${file || 'retrieved_context.py'}\n` +
        `# Citation Range: Lines ${selectedCitation.startLine}-${selectedCitation.endLine}\n\n` +
        selectedCitation.snippet
      );
    }
    if (!file) {
      return (
        `"""\nCodeLens AI Workspace — Production Code Viewer\n\n` +
        `• Select any file from the Explorer on the left.\n` +
        `• Ask questions in the AI Assistant on the right.\n` +
        `• Click any citation card to jump to highlighted lines.\n` +
        `• Press ⌘K to search and jump to any file.\n"""\n\n` +
        `def welcome_to_codelens():\n    return "AST + Hybrid Qdrant + Gemini 3.6 Flash"\n`
      );
    }
    return (
      `# File: ${file}\n\n` +
      `"""\nFile loaded from repository.\nTree-Sitter AST slices indexed in Qdrant.\n"""\n\n` +
      `def main() -> None:\n    print("Inspecting ${file} in CodeLens Monaco Editor")\n`
    );
  };

  /* Monaco editor mount */
  const handleEditorDidMount: OnMount = (editorInstance, monaco) => {
    editorRef.current = editorInstance;
    monacoRef.current = monaco;

    monaco.editor.defineTheme('codelens-dark', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '4b6274', fontStyle: 'italic' },
        { token: 'keyword', foreground: '818cf8', fontStyle: 'bold' },
        { token: 'string', foreground: '34d399' },
        { token: 'number', foreground: 'fb923c' },
        { token: 'function', foreground: '38bdf8' },
        { token: 'type', foreground: 'c084fc' },
        { token: 'variable', foreground: 'e2e8f0' },
        { token: 'constant', foreground: 'fbbf24' },
      ],
      colors: {
        'editor.background': '#07090e',
        'editor.foreground': '#f1f5f9',
        'editor.lineHighlightBackground': '#0d1220',
        'editorGutter.background': '#07090e',
        'editorCursor.foreground': '#818cf8',
        'editorLineNumber.foreground': '#2e3f55',
        'editorLineNumber.activeForeground': '#818cf8',
        'editorIndentGuide.background': '#1a2434',
        'editorIndentGuide.activeBackground': '#2a3a54',
        'editor.selectionBackground': '#3730a350',
        'editorBracketMatch.background': '#818cf820',
        'editorBracketMatch.border': '#818cf860',
      },
    });
    monaco.editor.setTheme('codelens-dark');
  };

  /* Citation highlight effect */
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !selectedCitation) {
      if (editorRef.current && decorationsRef.current.length > 0) {
        decorationsRef.current = editorRef.current.deltaDecorations(decorationsRef.current, []);
      }
      return;
    }
    const { startLine, endLine } = selectedCitation;
    const monaco = monacoRef.current;
    const ed = editorRef.current;
    ed.revealLinesInCenter(startLine, endLine, monaco.editor.ScrollType.Smooth);
    decorationsRef.current = ed.deltaDecorations(decorationsRef.current, [
      {
        range: new monaco.Range(startLine, 1, endLine, 1),
        options: {
          isWholeLine: true,
          className: 'monaco-citation-highlight',
          glyphMarginClassName: 'monaco-citation-glyph',
          linesDecorationsClassName: 'monaco-citation-glyph',
        },
      },
    ]);
  }, [selectedCitation]);

  /* Copy code */
  const handleCopyCode = () => {
    navigator.clipboard.writeText(getCodeContent());
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  /* Fullscreen toggle */
  const toggleFullscreen = () => {
    setIsFullscreen((v) => !v);
    setTimeout(() => editorRef.current?.layout(), 50);
  };

  const currentFile = activeTab ?? selectedFile;
  const lang = getLanguage(currentFile);

  return (
    <main
      className={`h-full flex flex-col bg-[#07090e] overflow-hidden ${
        isFullscreen ? 'fixed inset-0 z-50' : ''
      }`}
      aria-label="Monaco Code Editor"
    >
      {/* Tab bar */}
      <div className="flex items-stretch bg-[#0c101a] border-b border-white/[0.06] overflow-x-auto shrink-0" style={{ height: '36px' }}>
        {tabs.length === 0 ? (
          <div className="flex items-center gap-2 px-3 h-full editor-tab active">
            <FileCode size={12} className="text-indigo-400" />
            <span>welcome.py</span>
            <span className="text-[10px] text-slate-500 font-sans ml-1">(python)</span>
          </div>
        ) : (
          tabs.map((tab) => (
            <div
              key={tab.path}
              onClick={() => switchTab(tab.path)}
              className={`editor-tab ${activeTab === tab.path ? 'active' : ''}`}
            >
              <FileCode size={11} className={activeTab === tab.path ? 'text-indigo-400' : 'text-slate-500'} />
              <span>{tab.label}</span>
              <button
                className="close-btn ml-1 text-slate-500 hover:text-rose-400 rounded p-0.5 transition-colors"
                onClick={(e) => closeTab(tab.path, e)}
                title={`Close ${tab.label}`}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor">
                  <path d="M1 1l6 6M7 1l-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
            </div>
          ))
        )}

        {/* Right actions */}
        <div className="flex items-center gap-1.5 ml-auto px-2 shrink-0">
          {selectedCitation && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-950/60 border border-emerald-500/40 text-[10px] text-emerald-300 animate-slide-right">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>L{selectedCitation.startLine}–{selectedCitation.endLine}</span>
              <button onClick={clearCitationHighlight} className="ml-1 text-slate-500 hover:text-white" title="Clear">
                <X size={11} />
              </button>
            </div>
          )}
          <button
            onClick={handleCopyCode}
            title="Copy Code"
            className="flex items-center gap-1 px-2 py-1 rounded bg-white/[0.05] hover:bg-white/[0.10] text-slate-400 hover:text-white text-[10px] font-mono transition-colors"
          >
            {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
            className="p-1.5 rounded text-slate-500 hover:text-white hover:bg-white/5 transition-colors"
          >
            {isFullscreen ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        </div>
      </div>

      {/* Monaco Editor */}
      <div className="flex-1 w-full relative overflow-hidden">
        <Editor
          height="100%"
          language={lang}
          value={getCodeContent()}
          theme="codelens-dark"
          onMount={handleEditorDidMount}
          options={{
            readOnly: true,
            fontSize: 12.5,
            fontFamily: "'JetBrains Mono', 'Fira Code', Menlo, monospace",
            fontLigatures: true,
            lineHeight: 20,
            minimap: { enabled: true, scale: 0.75, showSlider: 'mouseover' },
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            lineNumbers: 'on',
            glyphMargin: true,
            folding: true,
            foldingHighlight: true,
            renderLineHighlight: 'all',
            padding: { top: 12, bottom: 12 },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            bracketPairColorization: { enabled: true },
            guides: { indentation: true, bracketPairs: true },
            renderWhitespace: 'selection',
            occurrencesHighlight: 'off',
            overviewRulerLanes: 2,
          }}
        />
      </div>

      {/* Status bar */}
      <div className="h-6 px-3 bg-[#090c16] border-t border-white/[0.05] flex items-center justify-between text-[10px] text-slate-600 font-mono shrink-0">
        <div className="flex items-center gap-4">
          <span className="text-slate-500">UTF-8</span>
          <span className="text-indigo-400/80">{lang.toUpperCase()}</span>
          <span>Spaces: 4</span>
          {currentFile && (
            <span className="text-slate-600 truncate max-w-xs">{currentFile}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
          <span className="text-slate-500">CodeLens Intelligence Active</span>
        </div>
      </div>
    </main>
  );
};
