extends CharacterBody2D

@onready var anim: AnimatedSprite2D = $AnimatedSprite2D

# Movement
@export var speed: float = 100.0
@export var run_speed: float = 180.0
@export var crouch_speed: float = 40.0

var _facing_right: bool = true

func _ready() -> void:
	anim.play("idle")

func _physics_process(_delta: float) -> void:
	var dir := Vector2.ZERO
	dir.x = Input.get_axis("ui_left", "ui_right")
	dir.y = Input.get_axis("ui_up", "ui_down")
	
	# Crouch
	if Input.is_action_pressed("ui_down"):
		anim.play("crouch")
		velocity = dir.normalized() * crouch_speed
	# Run (Shift held)
	elif Input.is_action_pressed("ui_accept"):
		anim.play("run")
		velocity = dir.normalized() * run_speed
	# Walk
	elif dir.length() > 0:
		anim.play("walk")
		velocity = dir.normalized() * speed
	# Idle
	else:
		anim.play("idle")
		velocity = Vector2.ZERO
	
	# Flip sprite based on direction
	if dir.x != 0:
		_facing_right = dir.x > 0
		anim.scale.x = 1 if _facing_right else -1
	
	# Jump
	if Input.is_action_just_pressed("ui_accept") and is_on_floor():
		velocity.y = -300.0
		anim.play("jump")
	
	move_and_slide()
