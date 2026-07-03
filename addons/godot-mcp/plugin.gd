@tool
extends EditorPlugin

## Godot MCP Server Editor Plugin
## Starts the MCP server process when the editor opens, allowing AI agents
## (Claude Desktop, WorkBuddy, etc.) to interact with the current Godot project.
##
## Usage:
##   1. Copy this addons/ folder into your Godot project
##   2. Enable it in Project Settings > Plugins
##   3. AI agents connect via the MCP port (default: 3100)
##
## The plugin exposes the current project path and lets AI tools read/write
## scenes, scripts, and resources via the MCP protocol.

const PLUGIN_NAME := "godot-mcp-server"
const DEFAULT_PORT := 3100
const LOG_PREFIX := "[GodotMCP]"

var _server_process: EditorProcess = null
var _status_label: Label = null
var _dock: Control = null
var _port_spin: SpinBox = null
var _start_btn: Button = null
var _stop_btn: Button = null


func _enter_tree() -> void:
	_add_dock()


func _exit_tree() -> void:
	_stop_server()
	_remove_dock()


## ── Dock UI ──

func _add_dock() -> void:
	_dock = preload("res://addons/godot-mcp/mcp_dock.tscn").instantiate() as Control
	if _dock == null:
		# Fallback: create dock programmatically if scene doesn't exist
		_dock = Control.new()
		_dock.size = Vector2(280, 200)
		
		var title := Label.new()
		title.text = "MCP Server"
		title.add_theme_font_size_override("font_size", 14)
		title.position = Vector2(8, 8)
		_dock.add_child(title)
		
		var desc := Label.new()
		desc.text = "AI agent integration for Godot.\nStart server below."
		desc.add_theme_color_override("font_color", Color(0.6, 0.6, 0.6))
		desc.position = Vector2(8, 32)
		_dock.add_child(desc)
		
		_port_spin = SpinBox.new()
		_port_spin.position = Vector2(8, 80)
		_port_spin.size = Vector2(100, 24)
		_port_spin.min_value = 1024
		_port_spin.max_value = 65535
		_port_spin.value = DEFAULT_PORT
		_port_spin.tooltip_text = "MCP server port"
		_dock.add_child(_port_spin)
		
		var port_label := Label.new()
		port_label.text = "Port:"
		port_label.position = Vector2(8, 60)
		_dock.add_child(port_label)
		
		_start_btn = Button.new()
		_start_btn.text = "Start Server"
		_start_btn.position = Vector2(8, 115)
		_start_btn.size = Vector2(120, 30)
		_start_btn.pressed.connect(_on_start_pressed)
		_dock.add_child(_start_btn)
		
		_stop_btn = Button.new()
		_stop_btn.text = "Stop Server"
		_stop_btn.position = Vector2(140, 115)
		_stop_btn.size = Vector2(120, 30)
		_stop_btn.disabled = true
		_stop_btn.pressed.connect(_on_stop_pressed)
		_dock.add_child(_stop_btn)
		
		_status_label = Label.new()
		_status_label.text = "Status: Stopped"
		_status_label.add_theme_color_override("font_color", Color(0.8, 0.3, 0.3))
		_status_label.position = Vector2(8, 155)
		_dock.add_child(_status_label)
	
	add_control_to_dock(DOCK_SLOT_LEFT_UL, _dock)


func _remove_dock() -> void:
	if _dock:
		remove_control_from_docks(_dock)
		_dock.queue_free()
		_dock = null


## ── Server Control ──

func _start_server() -> void:
	if _server_process != null:
		return
	
	var project_dir: String = ProjectSettings.globalize_path("res://")
	var node_path: String = ProjectSettings.globalize_path("res://addons/godot-mcp/../../dist/index.js")
	
	# If the MCP server dist is bundled with the plugin, use that path
	if not FileAccess.file_exists(node_path):
		# Try relative to the project
		node_path = project_dir.path_join("node_modules/.bin/mcp-server")
		if not FileAccess.file_exists(node_path):
			printerr(LOG_PREFIX + " MCP server dist not found at: " + node_path)
			_set_status("Error: server not found", Color(0.8, 0.2, 0.2))
			return
	
	# Start via Node.js — spawn as editor process
	var port: int = int(_port_spin.value) if _port_spin else DEFAULT_PORT
	var args: PackedStringArray = [node_path]
	# Set the GODOT_PROJECT env var so the server knows which project to serve
	var env: Dictionary = {
		"GODOT_PROJECT": project_dir,
		"MCP_PORT": str(port),
	}
	
	var output: Array = []
	# Use OS.execute to start non-blocking
	var pid: int = OS.create_process("node", args, false, output)
	if pid <= 0:
		printerr(LOG_PREFIX + " Failed to start MCP server process")
		_set_status("Error: process failed", Color(0.8, 0.2, 0.2))
		return
	
	_server_process = EditorProcess.new()
	_server_process.pid = pid
	_set_status("Running on port " + str(port), Color(0.2, 0.8, 0.2))
	print(LOG_PREFIX + " MCP server started (PID: %d, project: %s, port: %d)" % [pid, project_dir, port])


func _stop_server() -> void:
	if _server_process == null:
		return
	var pid: int = _server_process.pid
	if pid > 0:
		OS.kill(pid)
		print(LOG_PREFIX + " MCP server stopped (PID: %d)" % pid)
	_server_process = null
	_set_status("Stopped", Color(0.8, 0.3, 0.3))


## ── UI Handlers ──

func _on_start_pressed() -> void:
	_start_server()


func _on_stop_pressed() -> void:
	_stop_server()


func _set_status(text: String, color: Color) -> void:
	if _status_label:
		_status_label.text = "Status: " + text
		_status_label.add_theme_color_override("font_color", color)
	if _start_btn:
		_start_btn.disabled = (text.begins_with("Running"))
	if _stop_btn:
		_stop_btn.disabled = not (text.begins_with("Running"))
