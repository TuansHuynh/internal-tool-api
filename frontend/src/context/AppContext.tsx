import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { 
    ExecuteRequest, 
    ExecuteLoadTest,
    CancelLoadTest,
    GetAllProjectsData,
    CreateProjectInDB,
    UpdateProjectInDB,
    DeleteProjectInDB,
    CreateFolderInDB,
    UpdateFolderInDB,
    DeleteFolderInDB,
    CreateRequestInDB,
    UpdateRequestInDB,
    DeleteRequestInDB,
    GetEnvironmentsFromDB,
    SaveEnvironmentToDB,
    DeleteEnvironmentFromDB,
    ExportFullWorkspace
} from '../../wailsjs/go/main/App';
import { core, main } from '../../wailsjs/go/models';

export interface KeyValueRow {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
    description?: string;
}

export type HeaderPair = KeyValueRow;
export type ParamPair = KeyValueRow;

export interface FormDataRow extends KeyValueRow {
    type: 'text' | 'file';
    filePath?: string;
}

export interface AuthConfig {
    username?: string;
    password?: string;
    apiKeyName?: string;
    apiKeyValue?: string;
    apiKeyAddTo?: 'header' | 'query';
}

export interface ApiTab {
    id: string;
    projectId: string;
    folderId?: string;
    name: string;
    method: string;
    baseUrl: string;
    port: string;
    usePort: boolean;
    apiPath: string;
    paramsList: ParamPair[];
    reqBody: string;
    bodyType: 'json' | 'raw' | 'urlencoded' | 'formdata' | 'none';
    urlEncodedList: KeyValueRow[];
    formDataList: FormDataRow[];
    headersList: HeaderPair[];
    authType: 'none' | 'bearer' | 'basic' | 'apikey';
    authToken: string;
    authConfig: AuthConfig;
    response: core.ResponsePayload | null;
}

export interface HistoryItem {
    id: string;
    method: string;
    url: string;
    status: number;
    time: number;
    timestamp: string;
}

export interface EnvVariable {
    id: string;
    key: string;
    value: string;
    enabled: boolean;
}

export interface Environment {
    id: string;
    name: string;
    variables: EnvVariable[];
}

interface AppContextType {
    tabs: ApiTab[];
    activeTabId: string;
    setActiveTabId: (id: string) => void;
    activeTab: ApiTab | null;
    updateActiveTab: (fields: Partial<ApiTab>) => void;
    createNewTab: (url?: string, method?: string) => void;
    closeTab: (id: string, e?: React.MouseEvent) => void;
    reorderTabs: (startIndex: number, endIndex: number) => void;
    history: HistoryItem[];
    loading: boolean;
    concurrency: number;
    setConcurrency: (num: number) => void;
    totalRequests: number;
    setTotalRequests: (num: number) => void;
    durationSec: number;
    setDurationSec: (num: number) => void;
    rampUpSec: number;
    setRampUpSec: (num: number) => void;
    targetRPS: number;
    setTargetRPS: (num: number) => void;
    stressResult: core.StressTestResult | null;
    stressLoading: boolean;
    handleSendRequest: () => Promise<void>;
    handleStartStressTest: () => Promise<void>;
    handleCancelStressTest: () => Promise<void>;
    environments: Environment[];
    setEnvironments: React.Dispatch<React.SetStateAction<Environment[]>>;
    activeEnvId: string;
    setActiveEnvId: (id: string) => void;
    saveEnvironment: (env: Environment) => Promise<void>;
    deleteEnvironment: (id: string) => Promise<void>;
    projects: main.DBProject[];
    folders: main.DBFolder[];
    dbRequests: main.DBRequest[];
    createProject: (name: string) => Promise<void>;
    renameProject: (id: string, name: string) => Promise<void>;
    deleteProject: (id: string) => Promise<void>;
    createFolder: (projectId: string, parentId: string, name: string) => Promise<void>;
    renameFolder: (id: string, name: string) => Promise<void>;
    deleteFolder: (id: string) => Promise<void>;
    createRequest: (projectId: string, folderId: string, name: string, method: string) => Promise<void>;
    renameRequest: (id: string, name: string) => Promise<void>;
    deleteRequest: (id: string) => Promise<void>;
    openSessionAsTab: (req: main.DBRequest) => void;
    refreshWorkspaceData: () => Promise<void>;
    exportWorkspace: () => Promise<string>;
    parseEnvVariables: (text: string) => string;
    buildFullUrl: (tab: ApiTab) => string;
    getMappedHeaders: (tab: ApiTab) => Record<string, string>;
    updateQueryParamsFromPath: (path: string) => void;
    updatePathFromQueryParams: (params: ParamPair[]) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
    const [tabs, setTabs] = useState<ApiTab[]>([]);
    const [activeTabId, setActiveTabId] = useState<string>('');
    const [history, setHistory] = useState<HistoryItem[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [concurrency, setConcurrency] = useState(10);
    const [totalRequests, setTotalRequests] = useState(100);
    const [durationSec, setDurationSec] = useState(0);
    const [rampUpSec, setRampUpSec] = useState(0);
    const [targetRPS, setTargetRPS] = useState(0);
    const [stressResult, setStressResult] = useState<core.StressTestResult | null>(null);
    const [stressLoading, setStressLoading] = useState(false);

    const [projects, setProjects] = useState<main.DBProject[]>([]);
    const [folders, setFolders] = useState<main.DBFolder[]>([]);
    const [dbRequests, setDbRequests] = useState<main.DBRequest[]>([]);

    const [environments, setEnvironments] = useState<Environment[]>([]);
    const [activeEnvId, setActiveEnvId] = useState<string>('none');

    const activeTab = tabs.find(t => t.id === activeTabId) || tabs[0] || null;

    // Load Environments from SQLite DB
    const loadEnvironments = async () => {
        try {
            const dbEnvs = await GetEnvironmentsFromDB();
            if (dbEnvs && dbEnvs.length > 0) {
                const mapped: Environment[] = dbEnvs.map(e => ({
                    id: e.id,
                    name: e.name,
                    variables: (e.variables || []).map((v: any) => ({
                        id: v.id,
                        key: v.key,
                        value: v.value,
                        enabled: !!v.enabled
                    }))
                }));
                setEnvironments(mapped);
                if (activeEnvId === 'none' || !mapped.some(m => m.id === activeEnvId)) {
                    setActiveEnvId(mapped[0].id);
                }
            } else {
                const defaultEnv: Environment = {
                    id: 'env_default',
                    name: 'Local Environment',
                    variables: [
                        { id: 'v1', key: 'base_url', value: 'https://jsonplaceholder.typicode.com', enabled: true },
                        { id: 'v2', key: 'token', value: 'Bearer Secret_Local_Token_123', enabled: true }
                    ]
                };
                await SaveEnvironmentToDB({
                    id: defaultEnv.id,
                    name: defaultEnv.name,
                    variables: defaultEnv.variables.map(v => ({
                        id: v.id,
                        key: v.key,
                        value: v.value,
                        enabled: v.enabled
                    }))
                } as any);
                setEnvironments([defaultEnv]);
                setActiveEnvId(defaultEnv.id);
            }
        } catch (err) {
            console.error("Failed to load environments from DB:", err);
        }
    };

    const saveEnvironment = async (env: Environment) => {
        try {
            await SaveEnvironmentToDB({
                id: env.id,
                name: env.name,
                variables: env.variables.map(v => ({
                    id: v.id,
                    key: v.key,
                    value: v.value,
                    enabled: v.enabled
                }))
            } as any);
            setEnvironments(prev => {
                const exists = prev.some(e => e.id === env.id);
                if (exists) {
                    return prev.map(e => e.id === env.id ? env : e);
                }
                return [...prev, env];
            });
        } catch (err) {
            console.error("Failed to save environment:", err);
        }
    };

    const deleteEnvironment = async (id: string) => {
        try {
            await DeleteEnvironmentFromDB(id);
            const remaining = environments.filter(e => e.id !== id);
            setEnvironments(remaining);
            if (activeEnvId === id) {
                setActiveEnvId(remaining.length > 0 ? remaining[0].id : 'none');
            }
        } catch (err) {
            console.error("Failed to delete environment:", err);
        }
    };

    const refreshWorkspaceData = async () => {
        try {
            const data = await GetAllProjectsData();
            setProjects(data.projects || []);
            setFolders(data.folders || []);
            setDbRequests(data.requests || []);

            if (!data.projects || data.projects.length === 0) {
                const defaultProjId = 'proj_default';
                await CreateProjectInDB(defaultProjId, 'Default Project');
                const defaultReqId = 'req_default';
                await CreateRequestInDB(defaultReqId, defaultProjId, '', 'Untitled Request', 'GET');
                await UpdateRequestInDB({
                    id: defaultReqId,
                    projectId: defaultProjId,
                    folderId: '',
                    name: 'Untitled Request',
                    method: 'GET',
                    baseUrl: 'https://jsonplaceholder.typicode.com',
                    port: '8080',
                    usePort: false,
                    apiPath: '/posts/1',
                    reqBody: '',
                    headersJson: JSON.stringify([{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }]),
                    paramsJson: JSON.stringify([]),
                    bodyType: 'json',
                    authType: 'none',
                    authToken: '',
                    authConfigJson: '{}'
                });

                const freshData = await GetAllProjectsData();
                setProjects(freshData.projects || []);
                setFolders(freshData.folders || []);
                setDbRequests(freshData.requests || []);
            }
        } catch (e) {
            console.error("Failed to load workspace data:", e);
        }
    };

    useEffect(() => {
        refreshWorkspaceData();
        loadEnvironments();
    }, []);

    useEffect(() => {
        if (dbRequests.length > 0 && tabs.length === 0) {
            openSessionAsTab(dbRequests[0]);
        }
    }, [dbRequests]);

    const saveTabToDB = async (tab: ApiTab) => {
        try {
            await UpdateRequestInDB({
                id: tab.id,
                projectId: tab.projectId,
                folderId: tab.folderId || '',
                name: tab.name,
                method: tab.method,
                baseUrl: tab.baseUrl,
                port: tab.port,
                usePort: tab.usePort,
                apiPath: tab.apiPath,
                reqBody: tab.reqBody,
                headersJson: JSON.stringify(tab.headersList),
                paramsJson: JSON.stringify(tab.paramsList),
                bodyType: tab.bodyType || 'json',
                authType: tab.authType || 'none',
                authToken: tab.authToken || '',
                authConfigJson: JSON.stringify(tab.authConfig || {})
            });
            setDbRequests(prev => prev.map(r => r.id === tab.id ? {
                ...r,
                name: tab.name,
                method: tab.method,
                baseUrl: tab.baseUrl,
                port: tab.port,
                usePort: tab.usePort,
                apiPath: tab.apiPath,
                reqBody: tab.reqBody,
                headersJson: JSON.stringify(tab.headersList),
                paramsJson: JSON.stringify(tab.paramsList),
                bodyType: tab.bodyType || 'json',
                authType: tab.authType || 'none',
                authToken: tab.authToken || '',
                authConfigJson: JSON.stringify(tab.authConfig || {})
            } : r));
        } catch (error) {
            console.error("Failed to auto-save request to DB:", error);
        }
    };

    const updateActiveTab = (fields: Partial<ApiTab>) => {
        if (!activeTabId) return;
        setTabs(prev => prev.map(t => {
            if (t.id === activeTabId) {
                const newTab = { ...t, ...fields };
                saveTabToDB(newTab);
                return newTab;
            }
            return t;
        }));
    };

    // 2-Way Sync between Query Params and apiPath
    const updateQueryParamsFromPath = (path: string) => {
        if (!activeTab) return;
        const qIndex = path.indexOf('?');
        if (qIndex === -1) {
            updateActiveTab({ apiPath: path, paramsList: [] });
            return;
        }

        const queryString = path.slice(qIndex + 1);
        const searchParams = new URLSearchParams(queryString);
        const newParams: ParamPair[] = [];

        searchParams.forEach((value, key) => {
            newParams.push({
                id: Date.now() + Math.random().toString(),
                key,
                value,
                enabled: true
            });
        });

        updateActiveTab({ apiPath: path, paramsList: newParams });
    };

    const updatePathFromQueryParams = (params: ParamPair[]) => {
        if (!activeTab) return;
        const basePath = activeTab.apiPath.split('?')[0] || '';
        const enabledParams = params.filter(p => p.enabled && p.key.trim() !== '');

        if (enabledParams.length === 0) {
            updateActiveTab({ apiPath: basePath, paramsList: params });
            return;
        }

        const searchParams = new URLSearchParams();
        enabledParams.forEach(p => {
            searchParams.append(p.key.trim(), p.value);
        });

        const newPath = `${basePath}?${searchParams.toString()}`;
        updateActiveTab({ apiPath: newPath, paramsList: params });
    };

    const openSessionAsTab = (req: main.DBRequest) => {
        const existing = tabs.find(t => t.id === req.id);
        if (existing) {
            setActiveTabId(req.id);
            return;
        }

        let parsedHeaders: HeaderPair[] = [];
        try {
            parsedHeaders = JSON.parse(req.headersJson || '[]');
        } catch {
            parsedHeaders = [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }];
        }

        let parsedParams: ParamPair[] = [];
        try {
            parsedParams = JSON.parse(req.paramsJson || '[]');
        } catch {
            parsedParams = [];
        }

        let parsedAuthConfig: AuthConfig = {};
        try {
            parsedAuthConfig = JSON.parse(req.authConfigJson || '{}');
        } catch {
            parsedAuthConfig = {};
        }

        const newTab: ApiTab = {
            id: req.id,
            projectId: req.projectId,
            folderId: req.folderId,
            name: req.name,
            method: req.method,
            baseUrl: req.baseUrl || '',
            port: req.port || '8080',
            usePort: !!req.usePort,
            apiPath: req.apiPath || '',
            paramsList: parsedParams,
            reqBody: req.reqBody || '',
            bodyType: (req.bodyType as any) || 'json',
            urlEncodedList: [],
            formDataList: [],
            headersList: parsedHeaders,
            authType: (req.authType as any) || 'none',
            authToken: req.authToken || '',
            authConfig: parsedAuthConfig,
            response: null
        };

        setTabs(prev => [...prev, newTab]);
        setActiveTabId(req.id);
    };

    const createNewTab = (url = '', method = 'GET') => {
        const projId = projects[0]?.id || 'proj_default';
        createRequest(projId, '', 'Untitled Request', method);
    };

    const closeTab = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        if (tabs.length === 1) return;
        const remainTabs = tabs.filter(t => t.id !== id);
        setTabs(remainTabs);
        if (activeTabId === id) {
            setActiveTabId(remainTabs[remainTabs.length - 1].id);
        }
    };

    const reorderTabs = (startIndex: number, endIndex: number) => {
        setTabs(prev => {
            const result = Array.from(prev);
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);
            return result;
        });
    };

    const createProject = async (name: string) => {
        const id = 'proj_' + Date.now();
        await CreateProjectInDB(id, name);
        await refreshWorkspaceData();
    };

    const renameProject = async (id: string, name: string) => {
        await UpdateProjectInDB(id, name);
        await refreshWorkspaceData();
    };

    const deleteProject = async (id: string) => {
        await DeleteProjectInDB(id);
        setTabs(prev => prev.filter(t => t.projectId !== id));
        await refreshWorkspaceData();
    };

    const createFolder = async (projectId: string, parentId: string, name: string) => {
        const id = 'fold_' + Date.now();
        await CreateFolderInDB(id, projectId, parentId, name);
        await refreshWorkspaceData();
    };

    const renameFolder = async (id: string, name: string) => {
        await UpdateFolderInDB(id, name);
        await refreshWorkspaceData();
    };

    const deleteFolder = async (id: string) => {
        await DeleteFolderInDB(id);
        const folderIDs = [id];
        for (let i = 0; i < folderIDs.length; i++) {
            const currentID = folderIDs[i];
            folders.filter(f => f.parentId === currentID).forEach(f => folderIDs.push(f.id));
        }
        const requestIDsToClose = dbRequests.filter(r => folderIDs.includes(r.folderId || '')).map(r => r.id);
        setTabs(prev => prev.filter(t => !requestIDsToClose.includes(t.id)));
        await refreshWorkspaceData();
    };

    const createRequest = async (projectId: string, folderId: string, name: string, method: string) => {
        const id = 'req_' + Date.now();
        await CreateRequestInDB(id, projectId, folderId, name, method);
        
        setTabs(prev => {
            const parsedHeaders = [{ id: '1', key: 'Content-Type', value: 'application/json', enabled: true }];
            const newTab: ApiTab = {
                id,
                projectId,
                folderId,
                name,
                method,
                baseUrl: '',
                port: '8080',
                usePort: false,
                apiPath: '',
                paramsList: [],
                reqBody: '',
                bodyType: 'json',
                urlEncodedList: [],
                formDataList: [],
                headersList: parsedHeaders,
                authType: 'none',
                authToken: '',
                authConfig: {},
                response: null
            };
            return [...prev, newTab];
        });
        setActiveTabId(id);
        await refreshWorkspaceData();
    };

    const renameRequest = async (id: string, name: string) => {
        const req = dbRequests.find(r => r.id === id);
        if (req) {
            const updated = { ...req, name };
            await UpdateRequestInDB(updated);
            setTabs(prev => prev.map(t => t.id === id ? { ...t, name } : t));
            await refreshWorkspaceData();
        }
    };

    const deleteRequest = async (id: string) => {
        await DeleteRequestInDB(id);
        setTabs(prev => prev.filter(t => t.id !== id));
        await refreshWorkspaceData();
    };

    const parseEnvVariables = (text: string): string => {
        if (!text || activeEnvId === 'none') return text;
        const currentEnv = environments.find(e => e.id === activeEnvId);
        if (!currentEnv) return text;

        let parsedText = text;
        currentEnv.variables.forEach(v => {
            if (v.enabled && v.key.trim() !== "") {
                const placeholder = `{{${v.key.trim()}}}`;
                parsedText = parsedText.replaceAll(placeholder, v.value);
            }
        });
        return parsedText;
    };

    const buildFullUrl = (tab: ApiTab): string => {
        const parsedBase = parseEnvVariables(tab.baseUrl.trim());
        const parsedPort = parseEnvVariables(tab.port.trim());
        let parsedPath = parseEnvVariables(tab.apiPath.trim());

        let cleanBase = parsedBase.replace(/\/+$/, '');
        let cleanPath = parsedPath.startsWith('/') ? parsedPath : `/${parsedPath}`;
        if (cleanPath === '/') cleanPath = '';

        let fullUrl = cleanBase;
        if (tab.usePort && parsedPort) {
            fullUrl += `:${parsedPort}`;
        }
        fullUrl += cleanPath;

        // Append API Key to query if enabled
        if (tab.authType === 'apikey' && tab.authConfig?.apiKeyAddTo === 'query' && tab.authConfig.apiKeyName && tab.authConfig.apiKeyValue) {
            const separator = fullUrl.includes('?') ? '&' : '?';
            const k = encodeURIComponent(parseEnvVariables(tab.authConfig.apiKeyName.trim()));
            const v = encodeURIComponent(parseEnvVariables(tab.authConfig.apiKeyValue.trim()));
            fullUrl += `${separator}${k}=${v}`;
        }

        return fullUrl;
    };

    const getMappedHeaders = (tab: ApiTab): Record<string, string> => {
        const mappedHeaders: Record<string, string> = {};

        // User Defined Headers
        tab.headersList.forEach(item => {
            if (item.enabled && item.key.trim() !== "") {
                mappedHeaders[item.key.trim()] = parseEnvVariables(item.value);
            }
        });

        // Bearer Token
        if (tab.authType === 'bearer' && tab.authToken && tab.authToken.trim() !== "") {
            const resolvedToken = parseEnvVariables(tab.authToken.trim());
            if (resolvedToken) {
                const headerVal = resolvedToken.toLowerCase().startsWith('bearer ')
                    ? resolvedToken
                    : `Bearer ${resolvedToken}`;
                mappedHeaders['Authorization'] = headerVal;
            }
        }

        // Basic Auth
        if (tab.authType === 'basic' && tab.authConfig?.username) {
            const u = parseEnvVariables(tab.authConfig.username.trim());
            const p = parseEnvVariables(tab.authConfig.password?.trim() || '');
            const encoded = btoa(`${u}:${p}`);
            mappedHeaders['Authorization'] = `Basic ${encoded}`;
        }

        // API Key Header
        if (tab.authType === 'apikey' && (!tab.authConfig?.apiKeyAddTo || tab.authConfig.apiKeyAddTo === 'header') && tab.authConfig?.apiKeyName) {
            const k = parseEnvVariables(tab.authConfig.apiKeyName.trim());
            const v = parseEnvVariables(tab.authConfig.apiKeyValue?.trim() || '');
            if (k) {
                mappedHeaders[k] = v;
            }
        }

        return mappedHeaders;
    };

    const getProcessedBody = (tab: ApiTab): string => {
        if (tab.bodyType === 'none') return '';
        if (tab.bodyType === 'urlencoded') {
            const params = new URLSearchParams();
            tab.urlEncodedList?.filter(item => item.enabled && item.key.trim()).forEach(item => {
                params.append(parseEnvVariables(item.key.trim()), parseEnvVariables(item.value));
            });
            return params.toString();
        }
        return parseEnvVariables(tab.reqBody);
    };

    const handleSendRequest = useCallback(async () => {
        if (!activeTab || loading) return;
        setLoading(true);
        updateActiveTab({ response: null });
        try {
            const finalUrl = buildFullUrl(activeTab);
            const headers = getMappedHeaders(activeTab);

            // Auto set Content-Type if urlencoded
            if (activeTab.bodyType === 'urlencoded' && !Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }

            const payload: core.RequestPayload = {
                method: activeTab.method,
                url: finalUrl,
                headers,
                body: getProcessedBody(activeTab),
                bodyType: activeTab.bodyType
            };
            
            const result = await ExecuteRequest(payload);
            updateActiveTab({ response: result });

            const newHistory: HistoryItem = {
                id: Date.now().toString(),
                method: activeTab.method,
                url: finalUrl,
                status: result.status,
                time: result.responseTimeMs,
                timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
            };
            setHistory(prev => [newHistory, ...prev].slice(0, 30));
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [activeTab, loading, environments, activeEnvId]);

    const handleStartStressTest = async () => {
        if (!activeTab) return;
        setStressLoading(true);
        setStressResult(null);
        try {
            const headers = getMappedHeaders(activeTab);
            if (activeTab.bodyType === 'urlencoded' && !Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) {
                headers['Content-Type'] = 'application/x-www-form-urlencoded';
            }

            const payload: core.RequestPayload = {
                method: activeTab.method,
                url: buildFullUrl(activeTab),
                headers,
                body: getProcessedBody(activeTab),
                bodyType: activeTab.bodyType
            };
            const result = await ExecuteLoadTest(payload, concurrency, totalRequests, durationSec, rampUpSec, targetRPS);
            setStressResult(result);
        } catch (error) {
            console.error(error);
        } finally {
            setStressLoading(false);
        }
    };

    const handleCancelStressTest = async () => {
        try {
            await CancelLoadTest();
        } catch (e) {
            console.error("Cancel stress test error:", e);
        }
    };

    const exportWorkspace = async (): Promise<string> => {
        return await ExportFullWorkspace();
    };

    // Global Keybindings Listener
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSendRequest();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
                e.preventDefault();
                createNewTab();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'w') {
                e.preventDefault();
                if (activeTabId) {
                    closeTab(activeTabId);
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleSendRequest, activeTabId]);

    return (
        <AppContext.Provider value={{
            tabs, activeTabId, setActiveTabId, activeTab, updateActiveTab, createNewTab, closeTab, reorderTabs,
            history, loading, concurrency, setConcurrency, totalRequests, setTotalRequests, durationSec, setDurationSec, rampUpSec, setRampUpSec, targetRPS, setTargetRPS, stressResult, stressLoading,
            handleSendRequest, handleStartStressTest, handleCancelStressTest,
            environments, setEnvironments, activeEnvId, setActiveEnvId, saveEnvironment, deleteEnvironment,
            projects, folders, dbRequests,
            createProject, renameProject, deleteProject,
            createFolder, renameFolder, deleteFolder,
            createRequest, renameRequest, deleteRequest,
            openSessionAsTab, refreshWorkspaceData, exportWorkspace,
            parseEnvVariables, buildFullUrl, getMappedHeaders,
            updateQueryParamsFromPath, updatePathFromQueryParams
        }}>
            {children}
        </AppContext.Provider>
    );
}

export function useApp() {
    const context = useContext(AppContext);
    if (!context) throw new Error("useApp must be used within an AppProvider");
    return context;
}