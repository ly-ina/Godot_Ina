// MCP Tool: generate_equipment_system — Terraria-style visual equipment system
// Generates: item definitions, equipment slots, visual layers, inventory UI
import * as fs from "fs";
import * as path from "path";

export interface GenerateEquipmentSystemArgs {
  /** Path to Godot project root */
  project_path: string;
  /** Number of equipment slots (head, body, legs, weapon, accessory) */
  slot_count?: number;
  /** Include inventory system (default: true) */
  inventory?: boolean;
  /** Include crafting system (default: false) */
  crafting?: boolean;
}

/**
 * Generate a complete visual equipment system with inventory.
 * Items automatically update character appearance when equipped.
 */
export function generateEquipmentSystem(args: GenerateEquipmentSystemArgs): string {
  const { project_path, slot_count = 5, inventory = true, crafting = false } = args;

  if (!project_path) throw new Error("project_path is required");
  if (!fs.existsSync(project_path)) throw new Error(`Project path not found: ${project_path}`);

  const scriptDir = path.join(project_path, "scripts", "systems");
  const sceneDir = path.join(project_path, "scenes", "systems");
  if (!fs.existsSync(scriptDir)) fs.mkdirSync(scriptDir, { recursive: true });
  if (!fs.existsSync(sceneDir)) fs.mkdirSync(sceneDir, { recursive: true });

  const slotNames = ["Helmet", "Chestplate", "Leggings", "Weapon", "Accessory1", "Accessory2", "Ring", "Boots"].slice(0, slot_count);

  // ── 1. Item definition ──
  const itemDefScript = [
    `# Item system — equipment definitions and visual layers`,
    `class_name Item`,
    `extends Resource`,
    ``,
    `@export var item_name: String = ""`,
    `@export var description: String = ""`,
    `@export var item_type: String = "material"  # weapon, armor_head, armor_body, armor_legs, accessory, consumable, material`,
    `@export var rarity: int = 0  # 0=common, 1=uncommon, 2=rare, 3=epic, 4=legendary`,
    `@export var stack_size: int = 1`,
    `@export var value: int = 0  # sell price`,
    ``,
    `# Visual equipment — these change character appearance`,
    `@export var sprite_path: String = ""  # res:// path to equipment sprite`,
    `@export var visual_layer: String = "body"  # Which layer this renders on: body, head_upper, head_lower, arms, legs, back`,
    `@export var animation_override: String = ""  # Override character animation when held (for weapons)`,
    ``,
    `# Stats`,
    `@export var damage: float = 0.0`,
    `@export var defense: float = 0.0`,
    `@export var speed_modifier: float = 1.0`,
    `@export var health_bonus: float = 0.0`,
    `@export var mana_bonus: float = 0.0`,
    ``,
    `# Special effects`,
    `@export var effects: Array[String] = []  # e.g. ["fire_aura", "glow", "particle_trail"]`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptDir, "item.gd"), itemDefScript, "utf-8");

  // ── 2. Equipment visual layer system ──
  const visualSystem = [
    `# Visual Equipment System — Terraria-style layered character appearance`,
    `# Each equipment slot renders a sprite on the corresponding visual layer`,
    `class_name EquipmentVisualSystem`,
    `extends Node`,
    ``,
    `@onready var _sprite: Sprite2D = get_parent().find_child("Sprite2D")`,
    ``,
    `# Visual layers (rendered in order)`,
    slotNames.map(s => `var _${s.toLowerCase()}_layer: Sprite2D = null`).join("\n"),
    ``,
    `func _ready() -> void:`,
    `\t_setup_visual_layers()`,
    ``,
    `func _setup_visual_layers() -> void:`,
    `\t# Create sprite layers for each equipment slot`,
    slotNames.map(s => [
      `\tvar ${s.toLowerCase()}_sprite := Sprite2D.new()`,
      `\t${s.toLowerCase()}_sprite.name = "${s}Layer"`,
      `\t${s.toLowerCase()}_sprite.z_index = _get_layer_z_index("${getLayer(s)}")`,
      `\tadd_child(${s.toLowerCase()}_sprite)`,
      `\t_${s.toLowerCase()}_layer = ${s.toLowerCase()}_sprite`,
    ].join("\n")).join("\n"),
    ``,
    `func equip_item(item: Item) -> void:`,
    `\tvar layer_name := "${getLayer(slotNames[0])}"`,
    slotNames.map((s, i) => [
      `\tif item.item_type == "${getItemType(s)}":`,
      `\t\tif _${s.toLowerCase()}_layer and item.sprite_path:`,
      `\t\t\tvar tex := load(item.sprite_path) as Texture2D`,
      `\t\t\tif tex:`,
      `\t\t\t\t_${s.toLowerCase()}_layer.texture = tex`,
      `\t\t\tlayer_name = "${getLayer(s)}"`,
    ].join("\n")).join("\n") + `\t\tapply_stat_modifiers(item)`,
    ``,
    `func unequip_slot(slot_name: String) -> void:`,
    `\tvar layer = get_node_or_null(slot_name + "Layer")`,
    `\tif layer:`,
    `\t\tlayer.texture = null`,
    ``,
    `func apply_stat_modifiers(item: Item) -> void:`,
    `\tvar parent := get_parent()`,
    `\tif parent.has_method("modify_stats"):`,
    `\t\tparent.modify_stats(item)`,
    ``,
    `func _get_layer_z_index(layer: String) -> int:`,
    `\tmatch layer:`,
    `\t\t"back": return -2`,
    `\t\t"legs": return -1`,
    `\t\t"body": return 0`,
    `\t\t"arms": return 1`,
    `\t\t"head_lower": return 2`,
    `\t\t"head_upper": return 3`,
    `\t\t_: return 0`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptDir, "equipment_visual_system.gd"), visualSystem, "utf-8");

  // ── 3. Inventory (if enabled) ──
  if (inventory) {
    const inventoryScript = [
      `# Inventory system — item storage, equip, unequip`,
      `class_name InventorySystem`,
      `extends Node`,
      ``,
      `signal item_added(item: Item, slot: int)`,
      `signal item_removed(slot: int)`,
      `signal item_equipped(item: Item, slot_name: String)`,
      `signal item_unequipped(slot_name: String)`,
      ``,
      `@export var max_slots: int = 40`,
      `@export var max_weight: float = 100.0`,
      ``,
      `var items: Array[Item] = []  # inventory slots`,
      `var equipped: Dictionary = {}  # slot_name -> Item`,
      ``,
      `func _ready() -> void:`,
      `\titems.resize(max_slots)`,
      ``,
      `func add_item(item: Item) -> bool:`,
      `\tfor i in range(max_slots):`,
      `\t\tif items[i] == null:`,
      `\t\t\titems[i] = item`,
      `\t\t\titem_added.emit(item, i)`,
      `\t\t\treturn true`,
      `\treturn false  # inventory full`,
      ``,
      `func remove_item(slot: int) -> void:`,
      `\tif slot >= 0 and slot < max_slots:`,
      `\t\titems[slot] = null`,
      `\t\titem_removed.emit(slot)`,
      ``,
      `func equip(slot: int) -> void:`,
      `\tvar item := items[slot]`,
      `\tif item == null: return`,
      `\tvar slot_name := _get_slot_for_item(item.item_type)`,
      `\tif slot_name == "": return`,
      `\t`,
      `\t# Unequip current item in that slot`,
      `\tif equipped.has(slot_name):`,
      `\t\tunequip(slot_name)`,
      `\t`,
      `\tequipped[slot_name] = item`,
      `\titems[slot] = null`,
      `\titem_equipped.emit(item, slot_name)`,
      ``,
      `func unequip(slot_name: String) -> void:`,
      `\tif not equipped.has(slot_name): return`,
      `\tvar item := equipped[slot_name] as Item`,
      `\t# Put back in inventory`,
      `\tif not add_item(item):`,
      `\t\t# Inventory full — drop on ground`,
      `\t\t_drop_item(item)`,
      `\tequipped.erase(slot_name)`,
      `\titem_unequipped.emit(slot_name)`,
      ``,
      `func get_total_weight() -> float:`,
      `\tvar w := 0.0`,
      `\tfor item in items:`,
      `\t\tif item: w += item.value * 0.1`,
      `\treturn w`,
      ``,
      `func _get_slot_for_item(item_type: String) -> String:`,
      `\tmatch item_type:`,
      slotNames.map((s, i) => `\t\t"${getItemType(s)}": return "${s}"`).join("\n"),
      `\treturn ""`,
      ``,
      `func _drop_item(item: Item) -> void:`,
      `\t# Create a pickup in the world`,
      `\tvar pickup = preload("res://scenes/systems/item_pickup.tscn").instantiate()`,
      `\tvar parent = get_parent()`,
      `\tif parent and parent.get_parent():`,
      `\t\tparent.get_parent().add_child(pickup)`,
      `\t\tpickup.global_position = parent.global_position`,
      ``,
    ].join("\n");
    fs.writeFileSync(path.join(scriptDir, "inventory_system.gd"), inventoryScript, "utf-8");

    // Item pickup scene
    const pickupScript = [
      `extends Area2D`,
      ``,
      `@export var item: Item = null`,
      `@export var pickup_radius: float = 16.0`,
      ``,
      `func _ready() -> void:`,
      `\tbody_entered.connect(_on_body_entered)`,
      `\t$CollisionShape2D.shape.radius = pickup_radius`,
      ``,
      `func _on_body_entered(body: Node2D) -> void:`,
      `\tvar inv = body.find_child("InventorySystem") as InventorySystem`,
      `\tif inv and item:`,
      `\t\tif inv.add_item(item):`,
      `\t\t\tqueue_free()`,
      ``,
    ].join("\n");
    fs.writeFileSync(path.join(scriptDir, "item_pickup.gd"), pickupScript, "utf-8");
  }

  // ── 4. Crafting (if enabled) ──
  if (crafting) {
    const craftingScript = [
      `# Crafting system — recipe-based item creation`,
      `class_name CraftingSystem`,
      `extends Node`,
      ``,
      `signal crafted(item: Item, count: int)`,
      ``,
      `class Recipe:`,
      `\textends RefCounted`,
      `\tvar result: Item`,
      `\tvar ingredients: Array[Dictionary] = []  # [{item: Item, count: int}]`,
      `\tvar craft_station: String = "manual"  # manual, furnace, anvil, workbench`,
      `\tvar craft_time: float = 1.0`,
      ``,
      `var recipes: Array[Recipe] = []`,
      ``,
      `func add_recipe(result: Item, ingredients: Array[Dictionary], station: String = "manual", time: float = 1.0) -> void:`,
      `\tvar r := Recipe.new()`,
      `\tr.result = result`,
      `\tr.ingredients = ingredients`,
      `\tr.craft_station = station`,
      `\tr.craft_time = time`,
      `\trecipes.append(r)`,
      ``,
      `func can_craft(recipe: Recipe, inventory: InventorySystem) -> bool:`,
      `\tfor ing in recipe.ingredients:`,
      `\t\tvar needed = ing.count`,
      `\t\tfor slot_item in inventory.items:`,
      `\t\t\tif slot_item and slot_item.item_name == ing.item.item_name:`,
      `\t\t\t\tneeded -= 1`,
      `\t\t\t\tif needed <= 0: break`,
      `\t\tif needed > 0: return false`,
      `\treturn true`,
      ``,
      `func craft(recipe: Recipe, inventory: InventorySystem) -> void:`,
      `\tif not can_craft(recipe, inventory): return`,
      `\t# Remove ingredients`,
      `\tfor ing in recipe.ingredients:`,
      `\t\tvar remaining = ing.count`,
      `\t\tfor i in range(inventory.max_slots):`,
      `\t\t\tif inventory.items[i] and inventory.items[i].item_name == ing.item.item_name:`,
      `\t\t\t\tinventory.remove_item(i)`,
      `\t\t\t\tremaining -= 1`,
      `\t\t\t\tif remaining <= 0: break`,
      `\t# Add result`,
      `\tinventory.add_item(recipe.result)`,
      `\tcrafted.emit(recipe.result, 1)`,
      ``,
    ].join("\n");
    fs.writeFileSync(path.join(scriptDir, "crafting_system.gd"), craftingScript, "utf-8");
  }

  // ── 5. Sample item definitions ──
  const sampleItems = [
    `# Sample equipment items — create more using Item resources`,
    `#`,
    `# Usage:`,
    `#   var sword = Item.new()`,
    `#   sword.item_name = "Iron Sword"`,
    `#   sword.item_type = "weapon"`,
    `#   sword.damage = 15.0`,
    `#   sword.sprite_path = "res://assets/items/sword.png"`,
    `#   inventory.add_item(sword)`,
    `#`,
    `# Equipment types and their visual layers:`,
    slotNames.map(s => `#   "${getItemType(s)}" → ${s} → renders on "${getLayer(s)}" layer`).join("\n"),
    `#`,
    `# Visual layer order (back to front):`,
    `#   back → legs → body → arms → head_lower → head_upper`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptDir, "sample_items.gd"), sampleItems, "utf-8");

  // ── 6. Equipment UI ──
  const uiScript = [
    `# Equipment UI — inventory grid + equipment slots`,
    `class_name EquipmentUI`,
    `extends Control`,
    ``,
    `@onready var inventory_grid: GridContainer = $InventoryGrid`,
    `@onready var equipment_panel: VBoxContainer = $EquipmentPanel`,
    ``,
    `var _inventory: InventorySystem`,
    ``,
    `func setup(inv: InventorySystem) -> void:`,
    `\t_inventory = inv`,
    `\t_refresh_ui()`,
    `\t_inventory.item_added.connect(_on_item_changed)`,
    `\t_inventory.item_removed.connect(_on_item_changed)`,
    `\t_inventory.item_equipped.connect(_on_item_equipped)`,
    ``,
    `func _refresh_ui() -> void:`,
    `\t# Clear grid`,
    `\tfor child in inventory_grid.get_children():`,
    `\t\tchild.queue_free()`,
    `\t`,
    `\t# Populate inventory`,
    `\tif _inventory:`,
    `\t\tfor i in range(_inventory.max_slots):`,
    `\t\t\tvar slot_btn := Button.new()`,
    `\t\t\tvar item = _inventory.items[i]`,
    `\t\t\tif item:`,
    `\t\t\t\tslot_btn.text = item.item_name`,
    `\t\t\t\tslot_btn.tooltip_text = item.description`,
    `\t\t\t\tslot_btn.pressed.connect(_on_slot_clicked.bind(i))`,
    `\t\t\telse:`,
    `\t\t\t\tslot_btn.text = "[empty]"`,
    `\t\t\tinventory_grid.add_child(slot_btn)`,
    ``,
    `func _on_slot_clicked(slot: int) -> void:`,
    `\tif _inventory:`,
    `\t\t_inventory.equip(slot)`,
    ``,
    `func _on_item_changed(_a, _b) -> void:`,
    `\t_refresh_ui()`,
    ``,
    `func _on_item_equipped(item: Item, slot_name: String) -> void:`,
    `\t_refresh_ui()`,
    ``,
  ].join("\n");
  fs.writeFileSync(path.join(scriptDir, "equipment_ui.gd"), uiScript, "utf-8");

  return [
    `Generated Equipment System — Terraria-style visual equipment`,
    ``,
    `Files:`,
    `  scripts/systems/item.gd                    — Item resource definition`,
    `  scripts/systems/equipment_visual_system.gd  — Visual layer rendering`,
    `  scripts/systems/inventory_system.gd         — Inventory + equip/unequip`,
    `  scripts/systems/equipment_ui.gd             — Equipment UI`,
    `  scripts/systems/item_pickup.gd              — World item pickup`,
    `  scripts/systems/sample_items.gd             — Usage examples`,
    `${crafting ? "  scripts/systems/crafting_system.gd        — Recipe crafting" : ""}`,
    ``,
    `Equipment slots (${slot_count}):`,
    slotNames.map((s, i) => `  ${i + 1}. ${s} (${getItemType(s)}) → renders on "${getLayer(s)}"`).join("\n"),
    ``,
    `Setup:`,
    `  1. Create Item resources (.tres) for your equipment`,
    `  2. Add EquipmentVisualSystem as child of your player node`,
    `  3. Add InventorySystem to handle item storage`,
    `  4. Add EquipmentUI to your HUD scene`,
    `  5. Create sprite textures for each equipment piece`,
    ``,
    `Visual layering (Terraria-style): back → legs → body → arms → head`,
    `Each equipped item renders on its layer with proper z-ordering.`,
  ].join("\n");
}

function getItemType(slot: string): string {
  const types: Record<string, string> = {
    Helmet: "armor_head", Chestplate: "armor_body", Leggings: "armor_legs",
    Weapon: "weapon", Accessory1: "accessory", Accessory2: "accessory",
    Ring: "accessory", Boots: "accessory",
  };
  return types[slot] || "accessory";
}

function getLayer(slot: string): string {
  const layers: Record<string, string> = {
    Helmet: "head_upper", Chestplate: "body", Leggings: "legs",
    Weapon: "arms", Accessory1: "back", Accessory2: "body",
    Ring: "arms", Boots: "legs",
  };
  return layers[slot] || "body";
}
