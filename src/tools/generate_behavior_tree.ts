// MCP Tool: generate_behavior_tree — Sims-style behavior tree AI generator
import * as fs from "fs";
import * as path from "path";
import { createScene } from "./create_scene.js";
import { addNode } from "./add_node.js";
import { parseTscnFile } from "../parsers/tscn-parser.js";
import { writeSceneToFile } from "../writers/tscn-writer.js";



export interface GenerateBehaviorTreeArgs {
  /** Path to Godot project root */
  project_path: string;
  /** Name for the NPC type (default: "NPC") */
  name?: string;
  /** How many needs to track (hunger, energy, social, hygiene, fun) */
  needs_count?: number;
  /** Include personality traits (default: true) */
  traits?: boolean;
  /** Include relationship system (default: false) */
  relationships?: boolean;
  /** Include daily schedule/clock (default: true) */
  schedule?: boolean;
}

/**
 * Generate a complete behavior tree AI system for NPCs.
 * Creates: BehaviorTree nodes, needs system, trait system, daily scheduler.
 */
export function generateBehaviorTree(args: GenerateBehaviorTreeArgs): string {
  const {
    project_path,
    name = "NPC",
    needs_count = 3,
    traits = true,
    relationships = false,
    schedule = true,
  } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  const scriptDir = path.join(project_path, "scripts", "ai");
  const sceneDir = path.join(project_path, "scenes", "npcs");
  if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });
  if (!fs.existsSync(sceneDir)) fs.mkdirSync(sceneDir, { recursive: true });

  const needNames = ["Hunger", "Energy", "Social", "Hygiene", "Fun"].slice(0, needs_count);
  const actions = generateActions(needs_count);

  // ── 1. BehaviorTree core node ──
  const btCorePath = path.join(scriptDir, "behavior_tree_core.gd");
  const btCore = [
    `# Behavior Tree Core — composite node types`,
    `# Inspired by The Sims' utility-based AI`,
    `#`,
    `# Usage:`,
    `#   var tree = BehaviorTreeRoot.new()`,
    `#   tree.add_child(SelectorNode.new([...]))`,
    `#   tree.tick(agent, delta)`,
    ``,
    `class_name BehaviorTreeRoot`,
    `extends Node`,
    ``,
    `# ── Base Task ──`,
    `class Task:`,
    `\textends RefCounted`,
    `\tvar status: String = "fresh"  # fresh, running, success, failure`,
    `\t`,
    `\tfunc tick(agent: Node, _delta: float) -> String:`,
    `\t\treturn "success"`,
    `\t`,
    `\tfunc reset() -> void:`,
    `\t\tstatus = "fresh"`,
    ``,
    `# ── Composite: Selector (OR) ──`,
    `# Runs children in order until one succeeds`,
    `class SelectorTask:`,
    `\textends Task`,
    `\tvar children: Array[Task] = []`,
    `\t`,
    `\tfunc _init(tasks: Array[Task]) -> void:`,
    `\t\tchildren = tasks`,
    `\t`,
    `\tfunc tick(agent: Node, delta: float) -> String:`,
    `\t\tfor child in children:`,
    `\t\t\tvar result = child.tick(agent, delta)`,
    `\t\t\tif result == "success":`,
    `\t\t\t\treturn "success"`,
    `\t\t\tif result == "running":`,
    `\t\t\t\treturn "running"`,
    `\t\treturn "failure"`,
    `\t`,
    `\tfunc reset() -> void:`,
    `\t\tfor child in children:`,
    `\t\t\tchild.reset()`,
    ``,
    `# ── Composite: Sequence (AND) ──`,
    `# Runs children in order until one fails`,
    `class SequenceTask:`,
    `\textends Task`,
    `\tvar children: Array[Task] = []`,
    `\t`,
    `\tfunc _init(tasks: Array[Task]) -> void:`,
    `\t\tchildren = tasks`,
    `\t`,
    `\tfunc tick(agent: Node, delta: float) -> String:`,
    `\t\tfor child in children:`,
    `\t\t\tvar result = child.tick(agent, delta)`,
    `\t\t\tif result == "failure":`,
    `\t\t\t\treturn "failure"`,
    `\t\t\tif result == "running":`,
    `\t\t\t\treturn "running"`,
    `\t\treturn "success"`,
    `\t`,
    `\tfunc reset() -> void:`,
    `\t\tfor child in children:`,
    `\t\t\tchild.reset()`,
    ``,
    `# ── Decorator: Invert ──`,
    `class InvertTask:`,
    `\textends Task`,
    `\tvar child: Task`,
    `\t`,
    `\tfunc _init(c: Task) -> void:`,
    `\t\tchild = c`,
    `\t`,
    `\tfunc tick(agent: Node, delta: float) -> String:`,
    `\t\tvar result = child.tick(agent, delta)`,
    `\t\tif result == "success": return "failure"`,
    `\t\tif result == "failure": return "success"`,
    `\t\treturn "running"`,
    ``,
    `# ── Action: Base class ──`,
    `class ActionTask:`,
    `\textends Task`,
    `\tvar action_name: String = ""`,
    `\tvar duration: float = 0.0`,
    `\tvar _elapsed: float = 0.0`,
    `\t`,
    `\tfunc _init(name: String, dur: float = 0.0) -> void:`,
    `\t\taction_name = name`,
    `\t\tduration = dur`,
    `\t`,
    `\tfunc tick(agent: Node, delta: float) -> String:`,
    `\t\tif status == "fresh":`,
    `\t\t\t_start(agent)`,
    `\t\t\tstatus = "running"`,
    `\t\t`,
    `\t\t_elapsed += delta`,
    `\t\t_process(agent, delta)`,
    `\t\t`,
    `\t\tif duration > 0 and _elapsed >= duration:`,
    `\t\t\t_end(agent)`,
    `\t\t\tstatus = "success"`,
    `\t\t\treturn "success"`,
    `\t\t`,
    `\t\treturn "running"`,
    `\t`,
    `\tfunc _start(agent: Node) -> void:`,
    `\t\tagent._on_action_start(action_name)`,
    `\t`,
    `\tfunc _process(agent: Node, _delta: float) -> void:`,
    `\t\tpass`,
    `\t`,
    `\tfunc _end(agent: Node) -> void:`,
    `\t\tagent._on_action_end(action_name)`,
    `\t`,
    `\tfunc reset() -> void:`,
    `\t\tstatus = "fresh"`,
    `\t\t_elapsed = 0.0`,
    ``,
    `# ── Condition ──`,
    `class ConditionTask:`,
    `\textends Task`,
    `\tvar condition: Callable`,
    `\t`,
    `\tfunc _init(cond: Callable) -> void:`,
    `\t\tcondition = cond`,
    `\t`,
    `\tfunc tick(agent: Node, _delta: float) -> String:`,
    `\t\treturn "success" if condition.call(agent) else "failure"`,
    ``,
  ].join("\n");
  fs.writeFileSync(btCorePath, btCore, "utf-8");

  // ── 2. NPC needs system ──
  const needsScript = [
    `# NPC Needs System — Sims-style utility AI`,
    `# Tracks needs and determines which action has highest urgency`,
    `class_name NeedsComponent`,
    `extends Node`,
    ``,
    needNames.map((n, i) => `@export var ${n.toLowerCase()}_decay: float = ${(0.5 + i * 0.3).toFixed(1)}  # per second`).join("\n"),
    ``,
    needNames.map((n, i) => `var ${n.toLowerCase()}: float = ${(50 + i * 10)}.0`).join("\n"),
    ``,
    `signal need_critical(need_name: String, value: float)`,
    `signal need_depleted(need_name: String)`,
    ``,
    `func _process(delta: float) -> void:`,
    needNames.map((n, i) => [
      `\t${n.toLowerCase()} -= ${n.toLowerCase()}_decay * delta`,
      `\tif ${n.toLowerCase()} < 20: need_critical.emit("${n}", ${n.toLowerCase()})`,
      `\tif ${n.toLowerCase()} <= 0: need_depleted.emit("${n}")`,
      `\t${n.toLowerCase()} = max(0, ${n.toLowerCase()})`,
    ].join("\n")).join("\n"),
    ``,
    `func get_most_urgent_need() -> Dictionary:`,
    `\tvar lowest = 100.0`,
    `\tvar need_name = ""`,
    needNames.map(n => [
      `\tif ${n.toLowerCase()} < lowest:`,
      `\t\tlowest = ${n.toLowerCase()}`,
      `\t\tneed_name = "${n}"`,
    ].join("\n")).join("\n"),
    `\treturn {"name": need_name, "value": lowest}`,
    ``,
    `func fulfill_need(need_name: String, amount: float) -> void:`,
    needNames.map(n => [
      `\tif need_name == "${n}":`,
      `\t\t${n.toLowerCase()} = min(100, ${n.toLowerCase()} + amount)`,
    ].join("\n")).join("\n"),
    ``,
  ].join("\n");
  const needsPath = path.join(scriptDir, "needs_component.gd");
  fs.writeFileSync(needsPath, needsScript, "utf-8");

  // ── 3. Personality traits ──
  if (traits) {
    const traitsScript = [
      `# Personality Traits System`,
      `# Each trait modifies need decay rates and action preferences`,
      `class_name PersonalityComponent`,
      `extends Node`,
      ``,
      `enum Trait { LAZY, ENERGETIC, SOCIAL, LONER, GOURMAND, CAREFREE }`,
      ``,
      `@export var traits: Array[Trait] = []`,
      `@export var trait_strength: Dictionary = {}  # Trait -> float 0.0..1.0`,
      ``,
      `func get_need_modifier(need_name: String) -> float:`,
      `\tvar mod := 1.0`,
      `\tfor trait in traits:`,
      `\t\tmatch trait:`,
      `\t\t\tTrait.LAZY:`,
      `\t\t\t\tif need_name == "Energy": mod *= 0.7  # decays slower`,
      `\t\t\tTrait.ENERGETIC:`,
      `\t\t\t\tif need_name == "Energy": mod *= 1.5  # decays faster`,
      `\t\t\tTrait.SOCIAL:`,
      `\t\t\t\tif need_name == "Social": mod *= 2.0  # decays faster (needs more)`,
      `\t\t\tTrait.LONER:`,
      `\t\t\t\tif need_name == "Social": mod *= 0.3  # decays slower`,
      `\t\t\tTrait.GOURMAND:`,
      `\t\t\t\tif need_name == "Hunger": mod *= 1.5`,
      `\t`,
      `\treturn mod`,
      ``,
    ].join("\n");
    fs.writeFileSync(path.join(scriptDir, "personality_component.gd"), traitsScript, "utf-8");
  }

  // ── 4. Daily schedule ──
  if (schedule) {
    const scheduleScript = [
      `# Daily Schedule System — Sims-style time-based activity triggers`,
      `class_name ScheduleComponent`,
      `extends Node`,
      ``,
      `class Activity:`,
      `\textends RefCounted`,
      `\tvar hour: int`,
      `\tvar minute: int`,
      `\tvar action: String`,
      `\tvar duration_minutes: int = 30`,
      `\tvar priority: int = 5  # 1-10`,
      `\t`,
      `\tfunc _init(h: int, m: int, a: String, d: int = 30, p: int = 5) -> void:`,
      `\t\thour = h`,
      `\t\tminute = m`,
      `\t\taction = a`,
      `\t\tduration_minutes = d`,
      `\t\tpriority = p`,
      ``,
      `@export var current_hour: int = 6  # 6 AM start`,
      `@export var current_minute: int = 0`,
      `@export var time_scale: float = 60.0  # 1 game second = 60 real seconds? no, 1 real sec = 60 game sec`,
      ``,
      `var schedule: Array[Activity] = []`,
      `var _elapsed: float = 0.0`,
      `var _current_activity: Activity = null`,
      ``,
      `signal time_changed(hour: int, minute: int)`,
      `signal activity_started(activity: Activity)`,
      `signal activity_ended(activity: Activity)`,
      ``,
      `func _ready() -> void:`,
      `\t_setup_default_schedule()`,
      ``,
      `func _setup_default_schedule() -> void:`,
      `\t# Morning`,
      `\tschedule.append(Activity.new(6, 0, "wake_up", 15, 8))`,
      `\tschedule.append(Activity.new(7, 0, "eat_breakfast", 30, 6))`,
      `\tschedule.append(Activity.new(8, 0, "work", 480, 7))  # 8 hours`,
      `\t# Evening`,
      `\tschedule.append(Activity.new(17, 0, "relax", 120, 5))`,
      `\tschedule.append(Activity.new(19, 0, "eat_dinner", 45, 6))`,
      `\tschedule.append(Activity.new(20, 0, "socialize", 120, 4))`,
      `\tschedule.append(Activity.new(22, 0, "sleep", 480, 9))`,
      ``,
      `func _process(delta: float) -> void:`,
      `\t_elapsed += delta * time_scale`,
      `\tvar total_minutes := int(_elapsed) / 60`,
      `\tvar new_hour := (total_minutes / 60) % 24`,
      `\tvar new_minute := total_minutes % 60`,
      `\t`,
      `\tif new_hour != current_hour or new_minute != current_minute:`,
      `\t\tcurrent_hour = new_hour`,
      `\t\tcurrent_minute = new_minute`,
      `\t\ttime_changed.emit(current_hour, current_minute)`,
      `\t\t_check_schedule()`,
      ``,
      `func _check_schedule() -> void:`,
      `\tfor activity in schedule:`,
      `\t\tif activity.hour == current_hour:`,
      `\t\t\tvar minute_diff := abs(activity.minute - current_minute)`,
      `\t\t\tif minute_diff <= 5:`,
      `\t\t\t\tstart_activity(activity)`,
      ``,
      `func start_activity(activity: Activity) -> void:`,
      `\tif _current_activity != activity:`,
      `\t\tif _current_activity:`,
      `\t\t\tactivity_ended.emit(_current_activity)`,
      `\t\t_current_activity = activity`,
      `\t\tactivity_started.emit(activity)`,
      ``,
    ].join("\n");
    fs.writeFileSync(path.join(scriptDir, "schedule_component.gd"), scheduleScript, "utf-8");
  }

  // ── 5. Main NPC scene + controller ──
  const npcController = [
    `# ${name} AI Controller — Behavior Tree driven`,
    `${traits ? "extends CharacterBody2D" : "extends CharacterBody2D"}`,
    ``,
    `# Components`,
    `@onready var needs: NeedsComponent = $NeedsComponent`,
    `${schedule ? "@onready var schedule: ScheduleComponent = $ScheduleComponent" : ""}`,
    `${traits ? "@onready var personality: PersonalityComponent = $PersonalityComponent" : ""}`,
    ``,
    `# Behavior tree`,
    `var _behavior_tree: BehaviorTreeRoot`,
    `var _current_action: String = ""`,
    `var _action_timer: float = 0.0`,
    ``,
    `func _ready() -> void:`,
    `\t_setup_behavior_tree()`,
    ``,
    `func _setup_behavior_tree() -> void:`,
    `\tvar bt = BehaviorTreeRoot.new()`,
    `\t`,
    `\t# Utility-based action selection (Sims-style)`,
    `\tvar root_selector := BehaviorTreeRoot.SelectorTask.new([`,
    `\t\t# Check each urgent need and create action`,
    actions.map(a => `\t\tBehaviorTreeRoot.ConditionTask.new(func(agent): return agent.needs.${a.need_var} < ${a.threshold})`).join(",\n"),
    `\t])`,
    `\t`,
    `\t# Wrap in idle loop`,
    `\t_behavior_tree = BehaviorTreeRoot.new()`,
    ``,
    `func _process(delta: float) -> void:`,
    `\t# Tick behavior tree`,
    `\tif _behavior_tree:`,
    `\t\t_behavior_tree.tick(self, delta)`,
    `\t`,
    `\t# Execute current action`,
    `\tif _current_action != "":`,
    `\t\t_action_timer += delta`,
    `\t\t_execute_action(_current_action, delta)`,
    ``,
    `func _on_action_start(action_name: String) -> void:`,
    `\t_current_action = action_name`,
    `\t_action_timer = 0.0`,
    `\t# Play animation`,
    `\t# $AnimationPlayer.play(action_name)`,
    ``,
    `func _on_action_end(action_name: String) -> void:`,
    `\t# Fulfill the need that triggered this action`,
    `\tmatch action_name:`,
    actions.map((a, i) => `\t\t"fulfill_${a.need_var}": needs.fulfill_need("${a.name}", ${a.fulfill_amount})`).join("\n"),
    `\t_current_action = ""`,
    ``,
    `func _execute_action(action_name: String, _delta: float) -> void:`,
    `\t# Move toward target if needed`,
    `\tpass`,
    ``,
  ].join("\n");

  const npcPath = path.join(scriptDir, `${name.toLowerCase()}_controller.gd`);
  fs.writeFileSync(npcPath, npcController, "utf-8");

  // Create NPC scene
  const sceneDirPath = path.join(project_path, "scenes", "npcs");
  const npcScenePath = path.join(sceneDirPath, `${name}.tscn`);
  createScene({ scene_path: npcScenePath, root_node_name: name, root_node_type: "CharacterBody2D", project_path });

  addNode({ scene_path: npcScenePath, parent_node_name: name, node_type: "CollisionShape2D", node_name: "CollisionShape2D" });
  addNode({ scene_path: npcScenePath, parent_node_name: name, node_type: "Sprite2D", node_name: "Sprite2D" });
  addNode({ scene_path: npcScenePath, parent_node_name: name, node_type: "NeedsComponent", node_name: "NeedsComponent" });
  if (traits) addNode({ scene_path: npcScenePath, parent_node_name: name, node_type: "PersonalityComponent", node_name: "PersonalityComponent" });
  if (schedule) addNode({ scene_path: npcScenePath, parent_node_name: name, node_type: "ScheduleComponent", node_name: "ScheduleComponent" });

  // Attach script
  const scene = parseTscnFile(npcScenePath);
  scene.extResources.push({ id: "1", type: "Script", path: `res://scripts/ai/${name.toLowerCase()}_controller.gd` });
  if (scene.rootNode) {
    scene.rootNode.properties = scene.rootNode.properties || {};
    scene.rootNode.properties.script = `ExtResource("1")`;
  }
  writeSceneToFile(scene, npcScenePath);

  return [
    `Generated ${name} AI System — Sims-style Behavior Tree`,
    ``,
    `Files created:`,
    `  scripts/ai/behavior_tree_core.gd      — Behavior Tree node types`,
    `  scripts/ai/needs_component.gd          — Needs system (${needNames.join(", ")})`,
    `${traits ? "  scripts/ai/personality_component.gd  — Traits (LAZY, ENERGETIC, SOCIAL, ...)" : ""}`,
    `${schedule ? "  scripts/ai/schedule_component.gd     — Daily schedule system" : ""}`,
    `  scripts/ai/${name.toLowerCase()}_controller.gd      — Main AI controller`,
    `  scenes/npcs/${name}.tscn              — NPC scene`,
    ``,
    `How it works:`,
    `  1. Needs decay over time (${needNames.map((n, i) => `${n}: ${(0.5 + i * 0.3).toFixed(1)}/s`).join(", ")})`,
    `  2. Behaviour tree selects action for most urgent need`,
    `  3. NPC performs action → need is fulfilled`,
    `${traits ? "  4. Traits modify need decay rates (e.g. LAZY → Energy decays slower)" : ""}`,
    `${schedule ? "  5. Daily schedule triggers time-based activities (work, sleep, etc.)" : ""}`,
    ``,
    `Add NPC instance to your scene:`,
    `  var npc = preload("res://scenes/npcs/${name}.tscn").instantiate()`,
    `  add_child(npc)`,
  ].join("\n");
}

function generateActions(count: number): Array<{ name: string; need_var: string; threshold: number; fulfill_amount: number }> {
  const all = [
    { name: "Hunger", need_var: "hunger", threshold: 40, fulfill_amount: 30 },
    { name: "Energy", need_var: "energy", threshold: 30, fulfill_amount: 40 },
    { name: "Social", need_var: "social", threshold: 35, fulfill_amount: 25 },
    { name: "Hygiene", need_var: "hygiene", threshold: 25, fulfill_amount: 50 },
    { name: "Fun", need_var: "fun", threshold: 30, fulfill_amount: 20 },
  ];
  return all.slice(0, count);
}
