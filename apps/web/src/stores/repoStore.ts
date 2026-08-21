import { create } from 'zustand';
import { apiClient } from '../lib/api';

export interface Repository {
  id: string;
  owner_id: string;
  github_url: string;
  github_full_name: string;
  default_branch: string;
  indexing_status: 'pending' | 'cloning' | 'parsing' | 'embedding' | 'complete' | 'failed' | string;
  indexing_progress: number;
  total_chunks: number;
  error_message: string | null;
  created_at: string;
}

export interface CitationHighlight {
  filePath: string;
  startLine: number;
  endLine: number;
  snippet?: string;
}

interface RepoState {
  repos: Repository[];
  currentRepo: Repository | null;
  selectedFile: string | null;
  selectedFileContent: string | null;
  selectedCitation: CitationHighlight | null;
  loading: boolean;
  error: string | null;

  fetchRepos: () => Promise<void>;
  createRepo: (githubUrl: string, defaultBranch?: string) => Promise<Repository>;
  setCurrentRepo: (repo: Repository | string) => Promise<void>;
  selectFile: (filePath: string, content?: string) => void;
  highlightCitation: (filePath: string, startLine: number, endLine: number, snippet?: string) => void;
  clearCitationHighlight: () => void;
  deleteRepo: (repoId: string) => Promise<void>;
  updateIndexingProgress: (repoId: string, status: string, progress: number) => void;
}

export const useRepoStore = create<RepoState>((set, get) => ({
  repos: [],
  currentRepo: null,
  selectedFile: null,
  selectedFileContent: null,
  selectedCitation: null,
  loading: false,
  error: null,

  fetchRepos: async () => {
    set({ loading: true, error: null });
    try {
      const repos = await apiClient.get<Repository[]>('/api/v1/repos');
      set({ repos, loading: false });
    } catch (err: any) {
      set({ error: err.message || 'Failed to fetch repositories', loading: false });
    }
  },

  createRepo: async (githubUrl: string, defaultBranch: string = 'main') => {
    set({ loading: true, error: null });
    try {
      const newRepo = await apiClient.post<Repository>('/api/v1/repos', {
        github_url: githubUrl,
        default_branch: defaultBranch,
      });
      set((state) => ({
        repos: [newRepo, ...state.repos.filter((r) => r.id !== newRepo.id)],
        currentRepo: newRepo,
        loading: false,
      }));
      return newRepo;
    } catch (err: any) {
      set({ error: err.message || 'Failed to create repository', loading: false });
      throw err;
    }
  },

  setCurrentRepo: async (repoOrId: Repository | string) => {
    if (typeof repoOrId === 'string') {
      const existing = get().repos.find((r) => r.id === repoOrId);
      if (existing) {
        set({ currentRepo: existing });
        return;
      }
      try {
        const repo = await apiClient.get<Repository>(`/api/v1/repos/${repoOrId}`);
        set({ currentRepo: repo });
      } catch (err: any) {
        set({ error: err.message || 'Failed to get repository details' });
      }
    } else {
      set({ currentRepo: repoOrId });
    }
  },

  selectFile: (filePath: string, content?: string) => {
    set({
      selectedFile: filePath,
      selectedFileContent: content ?? null,
    });
  },

  highlightCitation: (filePath: string, startLine: number, endLine: number, snippet?: string) => {
    set({
      selectedFile: filePath,
      selectedCitation: { filePath, startLine, endLine, snippet },
    });
  },

  clearCitationHighlight: () => {
    set({ selectedCitation: null });
  },

  deleteRepo: async (repoId: string) => {
    try {
      await apiClient.delete(`/api/v1/repos/${repoId}`);
      set((state) => ({
        repos: state.repos.filter((r) => r.id !== repoId),
        currentRepo: state.currentRepo?.id === repoId ? null : state.currentRepo,
      }));
    } catch (err: any) {
      set({ error: err.message || 'Failed to delete repository' });
      throw err;
    }
  },

  updateIndexingProgress: (repoId: string, status: string, progress: number) => {
    set((state) => ({
      repos: state.repos.map((r) =>
        r.id === repoId ? { ...r, indexing_status: status, indexing_progress: progress } : r
      ),
      currentRepo:
        state.currentRepo?.id === repoId
          ? { ...state.currentRepo, indexing_status: status, indexing_progress: progress }
          : state.currentRepo,
    }));
  },
}));
