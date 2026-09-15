package main

import (
	"database/sql"
	"os"
	"path/filepath"

	_ "modernc.org/sqlite"
)

type DBProject struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type DBFolder struct {
	ID        string `json:"id"`
	ProjectID string `json:"projectId"`
	ParentID  string `json:"parentId,omitempty"`
	Name      string `json:"name"`
}

type DBRequest struct {
	ID             string `json:"id"`
	ProjectID      string `json:"projectId"`
	FolderID       string `json:"folderId,omitempty"`
	Name           string `json:"name"`
	Method         string `json:"method"`
	BaseURL        string `json:"baseUrl"`
	Port           string `json:"port"`
	UsePort        bool   `json:"usePort"`
	ApiPath        string `json:"apiPath"`
	ReqBody        string `json:"reqBody"`
	HeadersJson    string `json:"headersJson"`
	ParamsJson     string `json:"paramsJson"`
	BodyType       string `json:"bodyType"`
	AuthType       string `json:"authType"`
	AuthToken      string `json:"authToken"`
	AuthConfigJson string `json:"authConfigJson"`
}

type DBEnvVariable struct {
	ID      string `json:"id"`
	Key     string `json:"key"`
	Value   string `json:"value"`
	Enabled bool   `json:"enabled"`
}

type DBEnvironment struct {
	ID        string          `json:"id"`
	Name      string          `json:"name"`
	Variables []DBEnvVariable `json:"variables"`
}

type ProjectDataPayload struct {
	Projects []DBProject `json:"projects"`
	Folders  []DBFolder  `json:"folders"`
	Requests []DBRequest `json:"requests"`
}

type DBManager struct {
	db *sql.DB
}

func getDBPath() string {
	dir, err := os.UserConfigDir()
	if err != nil {
		return "api_client.db"
	}
	appDir := filepath.Join(dir, "internal-api-client")
	if err := os.MkdirAll(appDir, 0755); err != nil {
		return "api_client.db"
	}
	return filepath.Join(appDir, "api_client.db")
}

func InitDB() (*DBManager, error) {
	dbPath := getDBPath()
	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, err
	}

	queries := []string{
		`CREATE TABLE IF NOT EXISTS projects (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS folders (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			parent_id TEXT,
			name TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS requests (
			id TEXT PRIMARY KEY,
			project_id TEXT NOT NULL,
			folder_id TEXT,
			name TEXT NOT NULL,
			method TEXT NOT NULL,
			base_url TEXT NOT NULL,
			port TEXT NOT NULL,
			use_port INTEGER NOT NULL,
			api_path TEXT NOT NULL,
			req_body TEXT NOT NULL,
			headers_json TEXT NOT NULL,
			params_json TEXT DEFAULT '[]',
			body_type TEXT DEFAULT 'json',
			auth_type TEXT DEFAULT 'none',
			auth_token TEXT DEFAULT '',
			auth_config_json TEXT DEFAULT '{}'
		);`,
		`CREATE TABLE IF NOT EXISTS environments (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL
		);`,
		`CREATE TABLE IF NOT EXISTS env_variables (
			id TEXT PRIMARY KEY,
			env_id TEXT NOT NULL,
			var_key TEXT NOT NULL,
			var_val TEXT NOT NULL,
			enabled INTEGER NOT NULL DEFAULT 1,
			FOREIGN KEY(env_id) REFERENCES environments(id) ON DELETE CASCADE
		);`,
	}

	for _, query := range queries {
		if _, err := db.Exec(query); err != nil {
			db.Close()
			return nil, err
		}
	}

	// Auto-migrations for existing databases
	_, _ = db.Exec("ALTER TABLE requests ADD COLUMN auth_type TEXT DEFAULT 'none';")
	_, _ = db.Exec("ALTER TABLE requests ADD COLUMN auth_token TEXT DEFAULT '';")
	_, _ = db.Exec("ALTER TABLE requests ADD COLUMN params_json TEXT DEFAULT '[]';")
	_, _ = db.Exec("ALTER TABLE requests ADD COLUMN body_type TEXT DEFAULT 'json';")
	_, _ = db.Exec("ALTER TABLE requests ADD COLUMN auth_config_json TEXT DEFAULT '{}';")

	return &DBManager{db: db}, nil
}

// ==========================================
// PROJECTS CRUD
// ==========================================

func (m *DBManager) GetProjects() ([]DBProject, error) {
	rows, err := m.db.Query("SELECT id, name FROM projects")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []DBProject
	for rows.Next() {
		var p DBProject
		if err := rows.Scan(&p.ID, &p.Name); err != nil {
			return nil, err
		}
		list = append(list, p)
	}
	return list, nil
}

func (m *DBManager) CreateProject(id, name string) error {
	_, err := m.db.Exec("INSERT INTO projects (id, name) VALUES (?, ?)", id, name)
	return err
}

func (m *DBManager) UpdateProject(id, name string) error {
	_, err := m.db.Exec("UPDATE projects SET name = ? WHERE id = ?", name, id)
	return err
}

func (m *DBManager) DeleteProject(id string) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM requests WHERE project_id = ?", id); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM folders WHERE project_id = ?", id); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM projects WHERE id = ?", id); err != nil {
		return err
	}
	return tx.Commit()
}

// ==========================================
// FOLDERS CRUD
// ==========================================

func (m *DBManager) GetFolders() ([]DBFolder, error) {
	rows, err := m.db.Query("SELECT id, project_id, COALESCE(parent_id, ''), name FROM folders")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []DBFolder
	for rows.Next() {
		var f DBFolder
		var parentID string
		if err := rows.Scan(&f.ID, &f.ProjectID, &parentID, &f.Name); err != nil {
			return nil, err
		}
		f.ParentID = parentID
		list = append(list, f)
	}
	return list, nil
}

func (m *DBManager) CreateFolder(id, projectID, parentID, name string) error {
	var pID interface{}
	if parentID != "" {
		pID = parentID
	} else {
		pID = nil
	}
	_, err := m.db.Exec("INSERT INTO folders (id, project_id, parent_id, name) VALUES (?, ?, ?, ?)", id, projectID, pID, name)
	return err
}

func (m *DBManager) UpdateFolder(id, name string) error {
	_, err := m.db.Exec("UPDATE folders SET name = ? WHERE id = ?", name, id)
	return err
}

func (m *DBManager) DeleteFolder(id string) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	folderIDs := []string{id}
	for i := 0; i < len(folderIDs); i++ {
		currentID := folderIDs[i]
		rows, err := tx.Query("SELECT id FROM folders WHERE parent_id = ?", currentID)
		if err == nil {
			for rows.Next() {
				var subID string
				if err := rows.Scan(&subID); err == nil {
					folderIDs = append(folderIDs, subID)
				}
			}
			rows.Close()
		}
	}

	for _, fID := range folderIDs {
		if _, err := tx.Exec("DELETE FROM requests WHERE folder_id = ?", fID); err != nil {
			return err
		}
		if _, err := tx.Exec("DELETE FROM folders WHERE id = ?", fID); err != nil {
			return err
		}
	}

	return tx.Commit()
}

// ==========================================
// REQUESTS CRUD
// ==========================================

func (m *DBManager) GetRequests() ([]DBRequest, error) {
	rows, err := m.db.Query(`SELECT 
		id, project_id, COALESCE(folder_id, ''), name, method, base_url, port, use_port, api_path, req_body, 
		headers_json, COALESCE(params_json, '[]'), COALESCE(body_type, 'json'), 
		COALESCE(auth_type, 'none'), COALESCE(auth_token, ''), COALESCE(auth_config_json, '{}') 
		FROM requests`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var list []DBRequest
	for rows.Next() {
		var r DBRequest
		var folderID string
		var usePortInt int
		if err := rows.Scan(
			&r.ID, &r.ProjectID, &folderID, &r.Name, &r.Method, &r.BaseURL, &r.Port, &usePortInt, &r.ApiPath, &r.ReqBody,
			&r.HeadersJson, &r.ParamsJson, &r.BodyType,
			&r.AuthType, &r.AuthToken, &r.AuthConfigJson,
		); err != nil {
			return nil, err
		}
		r.FolderID = folderID
		r.UsePort = usePortInt == 1
		list = append(list, r)
	}
	return list, nil
}

func (m *DBManager) CreateRequest(id, projectID, folderID, name, method string) error {
	var fID interface{}
	if folderID != "" {
		fID = folderID
	} else {
		fID = nil
	}
	_, err := m.db.Exec(`INSERT INTO requests 
		(id, project_id, folder_id, name, method, base_url, port, use_port, api_path, req_body, headers_json, params_json, body_type, auth_type, auth_token, auth_config_json) 
		VALUES (?, ?, ?, ?, ?, '', '8080', 0, '', '', '[]', '[]', 'json', 'none', '', '{}')`,
		id, projectID, fID, name, method)
	return err
}

func (m *DBManager) UpdateRequest(req DBRequest) error {
	usePortInt := 0
	if req.UsePort {
		usePortInt = 1
	}
	var fID interface{}
	if req.FolderID != "" {
		fID = req.FolderID
	} else {
		fID = nil
	}
	if req.AuthType == "" {
		req.AuthType = "none"
	}
	if req.BodyType == "" {
		req.BodyType = "json"
	}
	if req.ParamsJson == "" {
		req.ParamsJson = "[]"
	}
	if req.AuthConfigJson == "" {
		req.AuthConfigJson = "{}"
	}
	_, err := m.db.Exec(`UPDATE requests SET 
		name = ?, 
		method = ?, 
		base_url = ?, 
		port = ?, 
		use_port = ?, 
		api_path = ?, 
		req_body = ?, 
		headers_json = ?,
		params_json = ?,
		body_type = ?,
		auth_type = ?,
		auth_token = ?,
		auth_config_json = ?,
		folder_id = ?
		WHERE id = ?`,
		req.Name, req.Method, req.BaseURL, req.Port, usePortInt, req.ApiPath, req.ReqBody, req.HeadersJson,
		req.ParamsJson, req.BodyType, req.AuthType, req.AuthToken, req.AuthConfigJson, fID, req.ID)
	return err
}

func (m *DBManager) DeleteRequest(id string) error {
	_, err := m.db.Exec("DELETE FROM requests WHERE id = ?", id)
	return err
}

// ==========================================
// ENVIRONMENTS CRUD
// ==========================================

func (m *DBManager) GetEnvironments() ([]DBEnvironment, error) {
	rows, err := m.db.Query("SELECT id, name FROM environments")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var envs []DBEnvironment
	for rows.Next() {
		var env DBEnvironment
		if err := rows.Scan(&env.ID, &env.Name); err != nil {
			return nil, err
		}
		envs = append(envs, env)
	}

	for i := range envs {
		varRows, err := m.db.Query("SELECT id, var_key, var_val, enabled FROM env_variables WHERE env_id = ?", envs[i].ID)
		if err != nil {
			continue
		}
		var vars []DBEnvVariable
		for varRows.Next() {
			var v DBEnvVariable
			var enabledInt int
			if err := varRows.Scan(&v.ID, &v.Key, &v.Value, &enabledInt); err == nil {
				v.Enabled = enabledInt == 1
				vars = append(vars, v)
			}
		}
		varRows.Close()
		envs[i].Variables = vars
	}

	return envs, nil
}

func (m *DBManager) SaveEnvironment(env DBEnvironment) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec("INSERT INTO environments (id, name) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET name = excluded.name", env.ID, env.Name)
	if err != nil {
		return err
	}

	if _, err := tx.Exec("DELETE FROM env_variables WHERE env_id = ?", env.ID); err != nil {
		return err
	}

	for _, v := range env.Variables {
		enabledInt := 0
		if v.Enabled {
			enabledInt = 1
		}
		_, err := tx.Exec("INSERT INTO env_variables (id, env_id, var_key, var_val, enabled) VALUES (?, ?, ?, ?, ?)",
			v.ID, env.ID, v.Key, v.Value, enabledInt)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (m *DBManager) DeleteEnvironment(id string) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM env_variables WHERE env_id = ?", id); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM environments WHERE id = ?", id); err != nil {
		return err
	}
	return tx.Commit()
}

func (m *DBManager) SaveAllEnvironments(envs []DBEnvironment) error {
	for _, env := range envs {
		if err := m.SaveEnvironment(env); err != nil {
			return err
		}
	}
	return nil
}