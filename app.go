package main

import (
	"context"
	_ "embed"
	"encoding/json"
	"internal-api-client/core"
	"runtime"
)

//go:embed version.json
var versionJsonData []byte

type AppInfo struct {
	Name           string `json:"name"`
	Version        string `json:"version"`
	OutputFileName string `json:"outputFileName"`
	BuildTime      string `json:"buildTime"`
	OS             string `json:"os"`
}

type App struct {
	ctx       context.Context
	engine    *core.HttpClientEngine
	dbManager *DBManager
}

func NewApp() *App {
	dbm, err := InitDB()
	if err != nil {
		println("Error initializing SQLite database:", err.Error())
	}
	return &App{
		engine:    core.NewHttpClientEngine(true, 30),
		dbManager: dbm,
	}
}

func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
}

func (a *App) GetAppInfo() AppInfo {
	var info AppInfo
	if len(versionJsonData) > 0 {
		_ = json.Unmarshal(versionJsonData, &info)
	}
	if info.Version == "" {
		info.Version = "1.3.1"
	}
	if info.Name == "" {
		info.Name = "internal-api-client"
	}
	info.OS = runtime.GOOS
	return info
}

func (a *App) ExecuteRequest(payload core.RequestPayload) (core.ResponsePayload, error) {
	return a.engine.Execute(payload)
}

func (a *App) ExecuteLoadTest(payload core.RequestPayload, concurrency int, total int, durationSec int, rampUpSec int, targetRPS int) core.StressTestResult {
	return a.engine.ExecuteStressTest(payload, concurrency, total, durationSec, rampUpSec, targetRPS)
}

func (a *App) CancelLoadTest() {
	a.engine.CancelStressTest()
}

func (a *App) GetAllProjectsData() (ProjectDataPayload, error) {
	var payload ProjectDataPayload
	if a.dbManager == nil {
		return payload, nil
	}
	projects, err := a.dbManager.GetProjects()
	if err != nil {
		return payload, err
	}
	folders, err := a.dbManager.GetFolders()
	if err != nil {
		return payload, err
	}
	requests, err := a.dbManager.GetRequests()
	if err != nil {
		return payload, err
	}

	payload.Projects = projects
	payload.Folders = folders
	payload.Requests = requests
	return payload, nil
}

func (a *App) CreateProjectInDB(id, name string) error {
	if a.dbManager == nil {
		return nil
	}
	return a.dbManager.CreateProject(id, name)
}

func (a *App) UpdateProjectInDB(id, name string) error {
	if a.dbManager == nil {
		return nil
	}
	return a.dbManager.UpdateProject(id, name)
}

func (a *App) DeleteProjectInDB(id string) error {
	if a.dbManager == nil {
		return nil
	}
	return a.dbManager.DeleteProject(id)
}

func (a *App) CreateFolderInDB(id, projectID, parentID, name string) error {
	if a.dbManager == nil {
		return nil
	}
	return a.dbManager.CreateFolder(id, projectID, parentID, name)
}

func (a *App) UpdateFolderInDB(id, name string) error {
	if a.dbManager == nil {
		return nil
	}
	return a.dbManager.UpdateFolder(id, name)
}

func (a *App) DeleteFolderInDB(id string) error {
	if a.dbManager == nil {
		return nil
	}
	return a.dbManager.DeleteFolder(id)
}

func (a *App) CreateRequestInDB(id, projectID, folderID, name, method string) error {
	if a.dbManager == nil {
		return nil
	}
	return a.dbManager.CreateRequest(id, projectID, folderID, name, method)
}

func (a *App) UpdateRequestInDB(req DBRequest) error {
	if a.dbManager == nil {
		return nil
	}
	return a.dbManager.UpdateRequest(req)
}

func (a *App) DeleteRequestInDB(id string) error {
	if a.dbManager == nil {
		return nil
	}
	return a.dbManager.DeleteRequest(id)
}

// Environments RPC

func (a *App) GetEnvironmentsFromDB() ([]DBEnvironment, error) {
	if a.dbManager == nil {
		return nil, nil
	}
	return a.dbManager.GetEnvironments()
}

func (a *App) SaveEnvironmentToDB(env DBEnvironment) error {
	if a.dbManager == nil {
		return nil
	}
	return a.dbManager.SaveEnvironment(env)
}

func (a *App) DeleteEnvironmentFromDB(id string) error {
	if a.dbManager == nil {
		return nil
	}
	return a.dbManager.DeleteEnvironment(id)
}

func (a *App) SaveAllEnvironmentsToDB(envs []DBEnvironment) error {
	if a.dbManager == nil {
		return nil
	}
	return a.dbManager.SaveAllEnvironments(envs)
}

// Workspace Export / Import

type FullWorkspaceExport struct {
	Projects     []DBProject     `json:"projects"`
	Folders      []DBFolder      `json:"folders"`
	Requests     []DBRequest     `json:"requests"`
	Environments []DBEnvironment `json:"environments"`
	Version      string          `json:"version"`
}

func (a *App) ExportFullWorkspace() (string, error) {
	data, err := a.GetAllProjectsData()
	if err != nil {
		return "", err
	}
	envs, err := a.GetEnvironmentsFromDB()
	if err != nil {
		return "", err
	}

	export := FullWorkspaceExport{
		Projects:     data.Projects,
		Folders:      data.Folders,
		Requests:     data.Requests,
		Environments: envs,
		Version:      "2.0",
	}

	b, err := json.MarshalIndent(export, "", "  ")
	if err != nil {
		return "", err
	}
	return string(b), nil
}