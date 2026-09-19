package main

import (
	"database/sql"
	"internal-api-client/internal/security"
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

type DBScenarioStep struct {
	ID             string `json:"id"`
	ScenarioID     string `json:"scenarioId"`
	StepOrder      int    `json:"stepOrder"`
	Name           string `json:"name"`
	Method         string `json:"method"`
	ApiPath        string `json:"apiPath"`
	HeadersJson    string `json:"headersJson"`
	ParamsJson     string `json:"paramsJson"`
	Body           string `json:"body"`
	BodyType       string `json:"bodyType"`
	AuthType       string `json:"authType"`
	AuthToken      string `json:"authToken"`
	AuthConfigJson string `json:"authConfigJson"`
	AssertionsJson string `json:"assertionsJson"`
	ExtractVarsJson string `json:"extractVarsJson"`
}

type DBScenario struct {
	ID          string           `json:"id"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	BaseURL     string           `json:"baseUrl"`
	StopOnError bool             `json:"stopOnError"`
	DelayMs     int              `json:"delayMs"`
	Steps       []DBScenarioStep `json:"steps"`
}

type DBUIStep struct {
	ID         string `json:"id"`
	ScenarioID string `json:"scenarioId"`
	SortOrder  int    `json:"sortOrder"`
	Type       string `json:"type"`
	Selector   string `json:"selector"`
	Value      string `json:"value"`
	Timeout    int    `json:"timeout"`
	ConfigJSON string `json:"configJson"`
	CreatedAt  string `json:"createdAt,omitempty"`
}

type DBUIScenario struct {
	ID        string     `json:"id"`
	ProjectID string     `json:"projectId,omitempty"`
	FolderID  string     `json:"folderId,omitempty"`
	Name      string     `json:"name"`
	Browser   string     `json:"browser"`
	BaseURL   string     `json:"baseUrl"`
	CreatedAt string     `json:"createdAt,omitempty"`
	UpdatedAt string     `json:"updatedAt,omitempty"`
	Steps     []DBUIStep `json:"steps"`
}

type DBUITestRun struct {
	ID         string `json:"id"`
	ScenarioID string `json:"scenarioId"`
	Status     string `json:"status"`
	StartedAt  string `json:"startedAt"`
	FinishedAt string `json:"finishedAt"`
	Duration   int64  `json:"duration"`
}

type DBUITestResult struct {
	ID             string `json:"id"`
	RunID          string `json:"runId"`
	StepID         string `json:"stepId"`
	Status         string `json:"status"`
	Error          string `json:"error"`
	Duration       int64  `json:"duration"`
	ScreenshotPath string `json:"screenshotPath"`
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
		`CREATE TABLE IF NOT EXISTS scenarios (
			id TEXT PRIMARY KEY,
			name TEXT NOT NULL,
			description TEXT DEFAULT '',
			base_url TEXT DEFAULT '',
			stop_on_error INTEGER DEFAULT 1,
			delay_ms INTEGER DEFAULT 0
		);`,
		`CREATE TABLE IF NOT EXISTS scenario_steps (
			id TEXT PRIMARY KEY,
			scenario_id TEXT NOT NULL,
			step_order INTEGER NOT NULL,
			name TEXT NOT NULL,
			method TEXT NOT NULL,
			api_path TEXT NOT NULL,
			headers_json TEXT DEFAULT '[]',
			params_json TEXT DEFAULT '[]',
			body TEXT DEFAULT '',
			body_type TEXT DEFAULT 'json',
			auth_type TEXT DEFAULT 'none',
			auth_token TEXT DEFAULT '',
			auth_config_json TEXT DEFAULT '{}',
			assertions_json TEXT DEFAULT '[]',
			extract_vars_json TEXT DEFAULT '[]',
			FOREIGN KEY(scenario_id) REFERENCES scenarios(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS ui_scenarios (
			id TEXT PRIMARY KEY,
			project_id TEXT DEFAULT '',
			folder_id TEXT DEFAULT '',
			name TEXT NOT NULL,
			browser TEXT DEFAULT 'chromium',
			base_url TEXT DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
		`CREATE TABLE IF NOT EXISTS ui_steps (
			id TEXT PRIMARY KEY,
			scenario_id TEXT NOT NULL,
			sort_order INTEGER NOT NULL,
			type TEXT NOT NULL,
			selector TEXT DEFAULT '',
			value TEXT DEFAULT '',
			timeout INTEGER DEFAULT 5000,
			config_json TEXT DEFAULT '{}',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			FOREIGN KEY(scenario_id) REFERENCES ui_scenarios(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS ui_test_runs (
			id TEXT PRIMARY KEY,
			scenario_id TEXT NOT NULL,
			status TEXT NOT NULL,
			started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			finished_at DATETIME,
			duration INTEGER DEFAULT 0,
			FOREIGN KEY(scenario_id) REFERENCES ui_scenarios(id) ON DELETE CASCADE
		);`,
		`CREATE TABLE IF NOT EXISTS ui_test_results (
			id TEXT PRIMARY KEY,
			run_id TEXT NOT NULL,
			step_id TEXT NOT NULL,
			status TEXT NOT NULL,
			error TEXT DEFAULT '',
			duration INTEGER DEFAULT 0,
			screenshot_path TEXT DEFAULT '',
			FOREIGN KEY(run_id) REFERENCES ui_test_runs(id) ON DELETE CASCADE
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

		// Decrypt sensitive credentials transparently
		if decToken, err := security.DecryptString(r.AuthToken); err == nil {
			r.AuthToken = decToken
		}
		if decConfig, err := security.DecryptString(r.AuthConfigJson); err == nil {
			r.AuthConfigJson = decConfig
		}

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

	// Encrypt sensitive authentication fields before saving
	encToken, err := security.EncryptString(req.AuthToken)
	if err != nil {
		encToken = req.AuthToken
	}
	encAuthConfig, err := security.EncryptString(req.AuthConfigJson)
	if err != nil {
		encAuthConfig = req.AuthConfigJson
	}

	_, err = m.db.Exec(`UPDATE requests SET 
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
		req.ParamsJson, req.BodyType, req.AuthType, encToken, encAuthConfig, fID, req.ID)
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
				// Decrypt value transparently
				if decVal, err := security.DecryptString(v.Value); err == nil {
					v.Value = decVal
				}
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
		// Encrypt environment variable value before storing
		encVal, err := security.EncryptString(v.Value)
		if err != nil {
			encVal = v.Value
		}
		_, err = tx.Exec("INSERT INTO env_variables (id, env_id, var_key, var_val, enabled) VALUES (?, ?, ?, ?, ?)",
			v.ID, env.ID, v.Key, encVal, enabledInt)
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

// ==========================================
// SCENARIOS CRUD
// ==========================================

func (m *DBManager) GetScenarios() ([]DBScenario, error) {
	rows, err := m.db.Query("SELECT id, name, description, base_url, stop_on_error, delay_ms FROM scenarios")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scenarios []DBScenario
	for rows.Next() {
		var s DBScenario
		var stopOnErrorInt int
		if err := rows.Scan(&s.ID, &s.Name, &s.Description, &s.BaseURL, &stopOnErrorInt, &s.DelayMs); err != nil {
			return nil, err
		}
		s.StopOnError = stopOnErrorInt == 1
		scenarios = append(scenarios, s)
	}

	for i := range scenarios {
		stepRows, err := m.db.Query(`
			SELECT id, scenario_id, step_order, name, method, api_path,
			       headers_json, params_json, body, body_type, auth_type,
			       auth_token, auth_config_json, assertions_json, extract_vars_json
			FROM scenario_steps
			WHERE scenario_id = ?
			ORDER BY step_order ASC
		`, scenarios[i].ID)
		if err != nil {
			continue
		}

		var steps []DBScenarioStep
		for stepRows.Next() {
			var st DBScenarioStep
			if err := stepRows.Scan(
				&st.ID, &st.ScenarioID, &st.StepOrder, &st.Name, &st.Method, &st.ApiPath,
				&st.HeadersJson, &st.ParamsJson, &st.Body, &st.BodyType, &st.AuthType,
				&st.AuthToken, &st.AuthConfigJson, &st.AssertionsJson, &st.ExtractVarsJson,
			); err == nil {
				// Decrypt sensitive fields
				if decToken, err := security.DecryptString(st.AuthToken); err == nil {
					st.AuthToken = decToken
				}
				if decConfig, err := security.DecryptString(st.AuthConfigJson); err == nil {
					st.AuthConfigJson = decConfig
				}
				steps = append(steps, st)
			}
		}
		stepRows.Close()
		scenarios[i].Steps = steps
	}

	return scenarios, nil
}

func (m *DBManager) SaveScenario(s DBScenario) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	stopOnErrorInt := 0
	if s.StopOnError {
		stopOnErrorInt = 1
	}

	_, err = tx.Exec(`
		INSERT INTO scenarios (id, name, description, base_url, stop_on_error, delay_ms)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			name = excluded.name,
			description = excluded.description,
			base_url = excluded.base_url,
			stop_on_error = excluded.stop_on_error,
			delay_ms = excluded.delay_ms
	`, s.ID, s.Name, s.Description, s.BaseURL, stopOnErrorInt, s.DelayMs)
	if err != nil {
		return err
	}

	if _, err := tx.Exec("DELETE FROM scenario_steps WHERE scenario_id = ?", s.ID); err != nil {
		return err
	}

	for idx, st := range s.Steps {
		encToken, err := security.EncryptString(st.AuthToken)
		if err != nil {
			encToken = st.AuthToken
		}
		encConfig, err := security.EncryptString(st.AuthConfigJson)
		if err != nil {
			encConfig = st.AuthConfigJson
		}

		stepOrder := st.StepOrder
		if stepOrder <= 0 {
			stepOrder = idx + 1
		}

		_, err = tx.Exec(`
			INSERT INTO scenario_steps (
				id, scenario_id, step_order, name, method, api_path,
				headers_json, params_json, body, body_type, auth_type,
				auth_token, auth_config_json, assertions_json, extract_vars_json
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
		`, st.ID, s.ID, stepOrder, st.Name, st.Method, st.ApiPath,
			st.HeadersJson, st.ParamsJson, st.Body, st.BodyType, st.AuthType,
			encToken, encConfig, st.AssertionsJson, st.ExtractVarsJson)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (m *DBManager) DeleteScenario(id string) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM scenario_steps WHERE scenario_id = ?", id); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM scenarios WHERE id = ?", id); err != nil {
		return err
	}
	return tx.Commit()
}

// ==========================================
// UI AUTOMATION SCENARIOS & RUNS CRUD
// ==========================================

func (m *DBManager) GetUIScenarios() ([]DBUIScenario, error) {
	rows, err := m.db.Query("SELECT id, project_id, folder_id, name, browser, base_url, created_at, updated_at FROM ui_scenarios ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var scenarios []DBUIScenario
	for rows.Next() {
		var s DBUIScenario
		var createdAt, updatedAt sql.NullString
		if err := rows.Scan(&s.ID, &s.ProjectID, &s.FolderID, &s.Name, &s.Browser, &s.BaseURL, &createdAt, &updatedAt); err != nil {
			return nil, err
		}
		s.CreatedAt = createdAt.String
		s.UpdatedAt = updatedAt.String
		scenarios = append(scenarios, s)
	}

	for i := range scenarios {
		stepRows, err := m.db.Query(`
			SELECT id, scenario_id, sort_order, type, selector, value, timeout, config_json, created_at
			FROM ui_steps
			WHERE scenario_id = ?
			ORDER BY sort_order ASC
		`, scenarios[i].ID)
		if err != nil {
			continue
		}

		var steps []DBUIStep
		for stepRows.Next() {
			var st DBUIStep
			var createdAt sql.NullString
			if err := stepRows.Scan(&st.ID, &st.ScenarioID, &st.SortOrder, &st.Type, &st.Selector, &st.Value, &st.Timeout, &st.ConfigJSON, &createdAt); err == nil {
				st.CreatedAt = createdAt.String
				steps = append(steps, st)
			}
		}
		stepRows.Close()
		scenarios[i].Steps = steps
	}

	return scenarios, nil
}

func (m *DBManager) GetUIScenario(id string) (*DBUIScenario, error) {
	row := m.db.QueryRow("SELECT id, project_id, folder_id, name, browser, base_url, created_at, updated_at FROM ui_scenarios WHERE id = ?", id)
	var s DBUIScenario
	var createdAt, updatedAt sql.NullString
	if err := row.Scan(&s.ID, &s.ProjectID, &s.FolderID, &s.Name, &s.Browser, &s.BaseURL, &createdAt, &updatedAt); err != nil {
		return nil, err
	}
	s.CreatedAt = createdAt.String
	s.UpdatedAt = updatedAt.String

	stepRows, err := m.db.Query(`
		SELECT id, scenario_id, sort_order, type, selector, value, timeout, config_json, created_at
		FROM ui_steps
		WHERE scenario_id = ?
		ORDER BY sort_order ASC
	`, s.ID)
	if err == nil {
		var steps []DBUIStep
		for stepRows.Next() {
			var st DBUIStep
			var cAt sql.NullString
			if err := stepRows.Scan(&st.ID, &st.ScenarioID, &st.SortOrder, &st.Type, &st.Selector, &st.Value, &st.Timeout, &st.ConfigJSON, &cAt); err == nil {
				st.CreatedAt = cAt.String
				steps = append(steps, st)
			}
		}
		stepRows.Close()
		s.Steps = steps
	}

	return &s, nil
}

func (m *DBManager) SaveUIScenario(s DBUIScenario) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if s.Browser == "" {
		s.Browser = "chromium"
	}

	_, err = tx.Exec(`
		INSERT INTO ui_scenarios (id, project_id, folder_id, name, browser, base_url, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
		ON CONFLICT(id) DO UPDATE SET
			project_id = excluded.project_id,
			folder_id = excluded.folder_id,
			name = excluded.name,
			browser = excluded.browser,
			base_url = excluded.base_url,
			updated_at = CURRENT_TIMESTAMP
	`, s.ID, s.ProjectID, s.FolderID, s.Name, s.Browser, s.BaseURL)
	if err != nil {
		return err
	}

	if _, err := tx.Exec("DELETE FROM ui_steps WHERE scenario_id = ?", s.ID); err != nil {
		return err
	}

	for idx, st := range s.Steps {
		sortOrder := st.SortOrder
		if sortOrder <= 0 {
			sortOrder = idx + 1
		}
		timeout := st.Timeout
		if timeout <= 0 {
			timeout = 5000
		}
		cfg := st.ConfigJSON
		if cfg == "" {
			cfg = "{}"
		}

		_, err = tx.Exec(`
			INSERT INTO ui_steps (id, scenario_id, sort_order, type, selector, value, timeout, config_json)
			VALUES (?, ?, ?, ?, ?, ?, ?, ?)
		`, st.ID, s.ID, sortOrder, st.Type, st.Selector, st.Value, timeout, cfg)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (m *DBManager) DeleteUIScenario(id string) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	if _, err := tx.Exec("DELETE FROM ui_steps WHERE scenario_id = ?", id); err != nil {
		return err
	}
	if _, err := tx.Exec("DELETE FROM ui_scenarios WHERE id = ?", id); err != nil {
		return err
	}
	return tx.Commit()
}

func (m *DBManager) SaveUITestRun(run DBUITestRun, results []DBUITestResult) error {
	tx, err := m.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	_, err = tx.Exec(`
		INSERT INTO ui_test_runs (id, scenario_id, status, started_at, finished_at, duration)
		VALUES (?, ?, ?, ?, ?, ?)
		ON CONFLICT(id) DO UPDATE SET
			status = excluded.status,
			finished_at = excluded.finished_at,
			duration = excluded.duration
	`, run.ID, run.ScenarioID, run.Status, run.StartedAt, run.FinishedAt, run.Duration)
	if err != nil {
		return err
	}

	for _, res := range results {
		_, err = tx.Exec(`
			INSERT INTO ui_test_results (id, run_id, step_id, status, error, duration, screenshot_path)
			VALUES (?, ?, ?, ?, ?, ?, ?)
		`, res.ID, run.ID, res.StepID, res.Status, res.Error, res.Duration, res.ScreenshotPath)
		if err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (m *DBManager) GetUITestRuns(scenarioID string) ([]DBUITestRun, error) {
	rows, err := m.db.Query(`
		SELECT id, scenario_id, status, started_at, COALESCE(finished_at, ''), duration
		FROM ui_test_runs
		WHERE scenario_id = ?
		ORDER BY started_at DESC
		LIMIT 20
	`, scenarioID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var runs []DBUITestRun
	for rows.Next() {
		var r DBUITestRun
		if err := rows.Scan(&r.ID, &r.ScenarioID, &r.Status, &r.StartedAt, &r.FinishedAt, &r.Duration); err == nil {
			runs = append(runs, r)
		}
	}
	return runs, nil
}

func (m *DBManager) GetUITestResults(runID string) ([]DBUITestResult, error) {
	rows, err := m.db.Query(`
		SELECT id, run_id, step_id, status, error, duration, screenshot_path
		FROM ui_test_results
		WHERE run_id = ?
		ORDER BY id ASC
	`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var results []DBUITestResult
	for rows.Next() {
		var res DBUITestResult
		if err := rows.Scan(&res.ID, &res.RunID, &res.StepID, &res.Status, &res.Error, &res.Duration, &res.ScreenshotPath); err == nil {
			results = append(results, res)
		}
	}
	return results, nil
}