export namespace core {
	
	export class RequestPayload {
	    method: string;
	    url: string;
	    headers: Record<string, string>;
	    body: string;
	    bodyType?: string;
	
	    static createFrom(source: any = {}) {
	        return new RequestPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.method = source["method"];
	        this.url = source["url"];
	        this.headers = source["headers"];
	        this.body = source["body"];
	        this.bodyType = source["bodyType"];
	    }
	}
	export class TimingDetails {
	    dnsTimeMs: number;
	    tcpTimeMs: number;
	    tlsTimeMs: number;
	    ttfbMs: number;
	    downloadTimeMs: number;
	    totalTimeMs: number;
	
	    static createFrom(source: any = {}) {
	        return new TimingDetails(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.dnsTimeMs = source["dnsTimeMs"];
	        this.tcpTimeMs = source["tcpTimeMs"];
	        this.tlsTimeMs = source["tlsTimeMs"];
	        this.ttfbMs = source["ttfbMs"];
	        this.downloadTimeMs = source["downloadTimeMs"];
	        this.totalTimeMs = source["totalTimeMs"];
	    }
	}
	export class ResponsePayload {
	    status: number;
	    statusText: string;
	    body: string;
	    headers: Record<string, string>;
	    responseTimeMs: number;
	    responseSizeByte: number;
	    timing: TimingDetails;
	
	    static createFrom(source: any = {}) {
	        return new ResponsePayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.status = source["status"];
	        this.statusText = source["statusText"];
	        this.body = source["body"];
	        this.headers = source["headers"];
	        this.responseTimeMs = source["responseTimeMs"];
	        this.responseSizeByte = source["responseSizeByte"];
	        this.timing = this.convertValues(source["timing"], TimingDetails);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StressTestResult {
	    totalRequests: number;
	    successCount: number;
	    failureCount: number;
	    averageTimeMs: number;
	    rps: number;
	    cancelled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new StressTestResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.totalRequests = source["totalRequests"];
	        this.successCount = source["successCount"];
	        this.failureCount = source["failureCount"];
	        this.averageTimeMs = source["averageTimeMs"];
	        this.rps = source["rps"];
	        this.cancelled = source["cancelled"];
	    }
	}

}

export namespace main {
	
	export class AppInfo {
	    name: string;
	    version: string;
	    outputFileName: string;
	    buildTime: string;
	    os: string;
	
	    static createFrom(source: any = {}) {
	        return new AppInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.version = source["version"];
	        this.outputFileName = source["outputFileName"];
	        this.buildTime = source["buildTime"];
	        this.os = source["os"];
	    }
	}
	export class DBEnvVariable {
	    id: string;
	    key: string;
	    value: string;
	    enabled: boolean;
	
	    static createFrom(source: any = {}) {
	        return new DBEnvVariable(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.key = source["key"];
	        this.value = source["value"];
	        this.enabled = source["enabled"];
	    }
	}
	export class DBEnvironment {
	    id: string;
	    name: string;
	    variables: DBEnvVariable[];
	
	    static createFrom(source: any = {}) {
	        return new DBEnvironment(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.variables = this.convertValues(source["variables"], DBEnvVariable);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class DBFolder {
	    id: string;
	    projectId: string;
	    parentId?: string;
	    name: string;
	
	    static createFrom(source: any = {}) {
	        return new DBFolder(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.projectId = source["projectId"];
	        this.parentId = source["parentId"];
	        this.name = source["name"];
	    }
	}
	export class DBProject {
	    id: string;
	    name: string;
	
	    static createFrom(source: any = {}) {
	        return new DBProject(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	    }
	}
	export class DBRequest {
	    id: string;
	    projectId: string;
	    folderId?: string;
	    name: string;
	    method: string;
	    baseUrl: string;
	    port: string;
	    usePort: boolean;
	    apiPath: string;
	    reqBody: string;
	    headersJson: string;
	    paramsJson: string;
	    bodyType: string;
	    authType: string;
	    authToken: string;
	    authConfigJson: string;
	
	    static createFrom(source: any = {}) {
	        return new DBRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.projectId = source["projectId"];
	        this.folderId = source["folderId"];
	        this.name = source["name"];
	        this.method = source["method"];
	        this.baseUrl = source["baseUrl"];
	        this.port = source["port"];
	        this.usePort = source["usePort"];
	        this.apiPath = source["apiPath"];
	        this.reqBody = source["reqBody"];
	        this.headersJson = source["headersJson"];
	        this.paramsJson = source["paramsJson"];
	        this.bodyType = source["bodyType"];
	        this.authType = source["authType"];
	        this.authToken = source["authToken"];
	        this.authConfigJson = source["authConfigJson"];
	    }
	}
	export class ProjectDataPayload {
	    projects: DBProject[];
	    folders: DBFolder[];
	    requests: DBRequest[];
	
	    static createFrom(source: any = {}) {
	        return new ProjectDataPayload(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.projects = this.convertValues(source["projects"], DBProject);
	        this.folders = this.convertValues(source["folders"], DBFolder);
	        this.requests = this.convertValues(source["requests"], DBRequest);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

