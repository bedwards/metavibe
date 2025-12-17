# Environment and Level Design

A horror game's environment is its most powerful tool. The creature stalks, mechanics create tension, but the space itself tells players what to fear. Every corridor, every room, every shadow is a design decision.

This chapter covers building spaces that terrify.

## The Psychology of Horror Spaces

Horror environments work through specific principles:

### 1. Limited Visibility
Players fear what they can't see. Design spaces that:
- Limit sightlines (corners, columns, furniture)
- Create pools of darkness between light sources
- Use fog, dust, or particle effects to obscure distance

### 2. Audio Ambiguity
Sounds without clear sources create paranoia:
- Vents and pipes that carry sound from other rooms
- Distant thuds, scrapes, and groans
- Footsteps that might be yours... or might not

### 3. Spatial Disorientation
When players can't trust their sense of space:
- Hallways that seem too long
- Rooms that feel larger inside than outside
- Subtle asymmetry that feels "wrong"

### 4. Environmental Storytelling
The space itself tells a story:
- Blood trails leading nowhere
- Furniture arranged as barricades
- Personal effects abandoned mid-action

## Building with Roblox Parts

Roblox offers multiple approaches to level design:

### Modular Building Blocks

Create reusable pieces that snap together:

```lua
-- src/server/LevelBuilder.server.luau
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local LevelBuilder = {}

-- Grid size for snapping
local GRID_SIZE = 8

local function snapToGrid(position)
    return Vector3.new(
        math.round(position.X / GRID_SIZE) * GRID_SIZE,
        math.round(position.Y / GRID_SIZE) * GRID_SIZE,
        math.round(position.Z / GRID_SIZE) * GRID_SIZE
    )
end

function LevelBuilder.placeModule(moduleName, position, rotation)
    local modules = ReplicatedStorage:WaitForChild("Modules")
    local module = modules:FindFirstChild(moduleName)

    if not module then
        warn("Module not found: " .. moduleName)
        return nil
    end

    local clone = module:Clone()
    local primaryPart = clone.PrimaryPart or clone:FindFirstChildWhichIsA("BasePart")

    if primaryPart then
        local snappedPos = snapToGrid(position)
        local cf = CFrame.new(snappedPos) * CFrame.Angles(0, math.rad(rotation or 0), 0)
        clone:SetPrimaryPartCFrame(cf)
    end

    clone.Parent = workspace.Level
    return clone
end

-- Common horror modules to create:
-- Corridor_Straight, Corridor_Corner, Corridor_T
-- Room_Small, Room_Medium, Room_Large
-- Door_Single, Door_Double, Door_Locked
-- Stairs_Up, Stairs_Down

return LevelBuilder
```

### Procedural Placement

For details that shouldn't be hand-placed:

```lua
-- src/server/EnvironmentDetails.server.luau
local function scatterDebris(room, density)
    local bounds = room:GetBoundingBox()
    local size = room:GetExtentsSize()

    local debrisTypes = {
        "Paper", "Bottle", "Can", "Box",
    }

    local count = math.floor(size.X * size.Z * density / 100)

    for i = 1, count do
        local randomX = (math.random() - 0.5) * size.X * 0.8
        local randomZ = (math.random() - 0.5) * size.Z * 0.8
        local position = bounds.Position + Vector3.new(randomX, 0, randomZ)

        -- Raycast to find floor
        local rayResult = workspace:Raycast(
            position + Vector3.new(0, 10, 0),
            Vector3.new(0, -20, 0)
        )

        if rayResult then
            local debris = ReplicatedStorage.Debris[debrisTypes[math.random(#debrisTypes)]]:Clone()
            debris.Position = rayResult.Position
            debris.Orientation = Vector3.new(
                math.random(-15, 15),
                math.random(0, 360),
                math.random(-15, 15)
            )
            debris.Parent = room
        end
    end
end

local function addBloodStains(room, count)
    local decal = Instance.new("Decal")
    decal.Texture = "rbxassetid://YOUR_BLOOD_TEXTURE"

    for i = 1, count do
        local surfaces = {}
        for _, part in ipairs(room:GetDescendants()) do
            if part:IsA("BasePart") then
                table.insert(surfaces, part)
            end
        end

        if #surfaces > 0 then
            local surface = surfaces[math.random(#surfaces)]
            local stain = decal:Clone()
            stain.Face = Enum.NormalId.Top  -- Floor stains
            stain.Parent = surface
        end
    end
end
```

## Lighting Design

Horror lighting follows specific rules:

### The Three-Point Darkness Rule

1. **Key light** - One strong light source players navigate toward
2. **Fill darkness** - Large areas of shadow between lights
3. **Accent lights** - Small, colored lights that create unease

```lua
-- src/server/LightingSetup.server.luau
local function createHorrorLight(position, config)
    config = config or {}

    local part = Instance.new("Part")
    part.Name = "LightSource"
    part.Anchored = true
    part.CanCollide = false
    part.Transparency = 1
    part.Position = position
    part.Parent = workspace.Lights

    local light = Instance.new("PointLight")
    light.Brightness = config.brightness or 1
    light.Range = config.range or 30
    light.Color = config.color or Color3.fromRGB(255, 200, 150)
    light.Shadows = config.shadows ~= false
    light.Parent = part

    -- Add subtle flicker for atmosphere
    if config.flicker then
        task.spawn(function()
            local baseBrightness = light.Brightness
            while light.Parent do
                local variance = (math.random() - 0.5) * config.flicker
                light.Brightness = baseBrightness + variance
                task.wait(0.05 + math.random() * 0.1)
            end
        end)
    end

    return light
end

-- Example usage:
-- Emergency light (red, flickering)
createHorrorLight(Vector3.new(0, 10, 0), {
    brightness = 0.8,
    range = 20,
    color = Color3.fromRGB(255, 50, 50),
    flicker = 0.3,
})

-- Dying fluorescent (harsh, unstable)
createHorrorLight(Vector3.new(20, 10, 0), {
    brightness = 1.5,
    range = 40,
    color = Color3.fromRGB(200, 255, 200),
    flicker = 0.5,
})
```

### Dynamic Light Zones

Different areas should have different lighting moods:

```lua
-- src/server/LightZones.server.luau
local Lighting = game:GetService("Lighting")
local Players = game:GetService("Players")

local LIGHT_ZONES = {
    safe = {
        Brightness = 0.8,
        Ambient = Color3.fromRGB(40, 40, 50),
        FogEnd = 300,
    },
    corridor = {
        Brightness = 0.3,
        Ambient = Color3.fromRGB(15, 15, 25),
        FogEnd = 150,
    },
    danger = {
        Brightness = 0.1,
        Ambient = Color3.fromRGB(10, 5, 5),
        FogEnd = 80,
    },
}

local function getPlayerZone(player)
    local character = player.Character
    if not character then return "corridor" end

    local rootPart = character:FindFirstChild("HumanoidRootPart")
    if not rootPart then return "corridor" end

    -- Check which zone the player is in
    for _, zone in ipairs(workspace.Zones:GetChildren()) do
        local zoneType = zone:GetAttribute("ZoneType")
        if zoneType and isInsideZone(rootPart.Position, zone) then
            return zoneType
        end
    end

    return "corridor"
end

local function isInsideZone(position, zonePart)
    local relativePos = zonePart.CFrame:PointToObjectSpace(position)
    local halfSize = zonePart.Size / 2
    return math.abs(relativePos.X) <= halfSize.X
        and math.abs(relativePos.Y) <= halfSize.Y
        and math.abs(relativePos.Z) <= halfSize.Z
end

-- Per-player lighting would require post-processing effects
-- For simplicity, use the "most dangerous" zone among all players
local function updateGlobalLighting()
    local mostDangerous = "safe"
    local dangerRank = { safe = 0, corridor = 1, danger = 2 }

    for _, player in ipairs(Players:GetPlayers()) do
        local zone = getPlayerZone(player)
        if dangerRank[zone] > dangerRank[mostDangerous] then
            mostDangerous = zone
        end
    end

    local settings = LIGHT_ZONES[mostDangerous]
    -- Tween to new settings
    for property, value in pairs(settings) do
        Lighting[property] = value
    end
end
```

## Door Systems

Doors are pivotal in horror—they create anticipation:

```lua
-- src/server/DoorSystem.server.luau
local TweenService = game:GetService("TweenService")
local SoundService = game:GetService("SoundService")

local DoorSystem = {}

local DOOR_SOUNDS = {
    open = "rbxassetid://YOUR_DOOR_OPEN",
    close = "rbxassetid://YOUR_DOOR_CLOSE",
    locked = "rbxassetid://YOUR_DOOR_LOCKED",
    unlock = "rbxassetid://YOUR_DOOR_UNLOCK",
    creak = "rbxassetid://YOUR_DOOR_CREAK",
}

function DoorSystem.setupDoor(doorModel)
    local hinge = doorModel:FindFirstChild("Hinge")
    local doorPart = doorModel:FindFirstChild("Door")

    if not hinge or not doorPart then
        warn("Invalid door model: " .. doorModel:GetFullName())
        return
    end

    local isOpen = false
    local isLocked = doorModel:GetAttribute("Locked") or false
    local requiredKey = doorModel:GetAttribute("RequiredKey")

    local originalCFrame = hinge.CFrame
    local openCFrame = originalCFrame * CFrame.Angles(0, math.rad(90), 0)

    local prompt = Instance.new("ProximityPrompt")
    prompt.ActionText = isLocked and "Locked" or "Open"
    prompt.MaxActivationDistance = 6
    prompt.HoldDuration = isLocked and 0.5 or 0
    prompt.Parent = doorPart

    local function playSound(soundType)
        local soundId = DOOR_SOUNDS[soundType]
        if not soundId then return end

        local sound = Instance.new("Sound")
        sound.SoundId = soundId
        sound.RollOffMode = Enum.RollOffMode.Linear
        sound.RollOffMaxDistance = 50
        sound.Parent = doorPart
        sound:Play()
        sound.Ended:Connect(function() sound:Destroy() end)
    end

    local function toggleDoor(player)
        if isLocked then
            -- Check if player has key
            if requiredKey then
                local inventory = getPlayerInventory(player)
                if inventory:hasItem(requiredKey) then
                    -- Unlock
                    isLocked = false
                    playSound("unlock")
                    prompt.ActionText = "Open"
                    prompt.HoldDuration = 0

                    -- Optionally consume key
                    -- inventory:removeItem(requiredKey)
                    return
                end
            end

            playSound("locked")
            return
        end

        isOpen = not isOpen

        local targetCFrame = isOpen and openCFrame or originalCFrame
        local tweenInfo = TweenInfo.new(0.8, Enum.EasingStyle.Quad, Enum.EasingDirection.Out)

        playSound(isOpen and "open" or "close")

        -- Occasional creak
        if math.random() < 0.3 then
            task.delay(0.2, function() playSound("creak") end)
        end

        local tween = TweenService:Create(hinge, tweenInfo, {
            CFrame = targetCFrame
        })
        tween:Play()

        prompt.ActionText = isOpen and "Close" or "Open"
    end

    prompt.Triggered:Connect(toggleDoor)
end

-- Creature can force doors
function DoorSystem.forceDoor(doorModel, force)
    local hinge = doorModel:FindFirstChild("Hinge")
    if not hinge then return end

    local originalCFrame = hinge.CFrame
    local forcedCFrame = originalCFrame * CFrame.Angles(0, math.rad(110), 0)

    -- Violent open
    local tweenInfo = TweenInfo.new(0.2, Enum.EasingStyle.Back, Enum.EasingDirection.Out)
    local tween = TweenService:Create(hinge, tweenInfo, {
        CFrame = forcedCFrame
    })

    -- Play crash sound
    local crash = Instance.new("Sound")
    crash.SoundId = "rbxassetid://YOUR_DOOR_CRASH"
    crash.Volume = 1.5
    crash.Parent = doorModel
    crash:Play()

    tween:Play()
end

return DoorSystem
```

## Hiding Spots

Players need places to hide from the creature:

```lua
-- src/server/HidingSpots.server.luau
local CollectionService = game:GetService("CollectionService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local HIDING_SPOTS = {}  -- Track occupied spots

local function setupHidingSpot(part)
    local spotId = part:GetFullName()
    HIDING_SPOTS[spotId] = {
        part = part,
        occupied = false,
        occupant = nil,
    }

    local prompt = Instance.new("ProximityPrompt")
    prompt.ActionText = "Hide"
    prompt.ObjectText = part:GetAttribute("SpotName") or "Hiding Spot"
    prompt.MaxActivationDistance = 5
    prompt.HoldDuration = 0.5
    prompt.Parent = part

    prompt.Triggered:Connect(function(player)
        local spot = HIDING_SPOTS[spotId]

        if spot.occupied then
            -- Already occupied
            return
        end

        -- Hide the player
        enterHidingSpot(player, spot)
    end)
end

local function enterHidingSpot(player, spot)
    local character = player.Character
    if not character then return end

    spot.occupied = true
    spot.occupant = player

    -- Make player invisible
    for _, part in ipairs(character:GetDescendants()) do
        if part:IsA("BasePart") then
            part.Transparency = 1
        end
    end

    -- Disable movement
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if humanoid then
        humanoid.WalkSpeed = 0
        humanoid.JumpPower = 0
    end

    -- Position player at hiding spot
    local rootPart = character:FindFirstChild("HumanoidRootPart")
    if rootPart then
        rootPart.CFrame = spot.part.CFrame
        rootPart.Anchored = true
    end

    -- Notify client
    ReplicatedStorage.Events.EnteredHiding:FireClient(player, spot.part)

    -- Create exit prompt
    local exitPrompt = Instance.new("ProximityPrompt")
    exitPrompt.ActionText = "Exit"
    exitPrompt.KeyboardKeyCode = Enum.KeyCode.E
    exitPrompt.HoldDuration = 0.3
    exitPrompt.Parent = spot.part

    exitPrompt.Triggered:Connect(function(exitPlayer)
        if exitPlayer == player then
            exitHidingSpot(player, spot)
            exitPrompt:Destroy()
        end
    end)
end

local function exitHidingSpot(player, spot)
    local character = player.Character
    if not character then return end

    spot.occupied = false
    spot.occupant = nil

    -- Make player visible
    for _, part in ipairs(character:GetDescendants()) do
        if part:IsA("BasePart") and part.Name ~= "HumanoidRootPart" then
            part.Transparency = 0
        end
    end

    -- Re-enable movement
    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if humanoid then
        humanoid.WalkSpeed = 16
        humanoid.JumpPower = 50
    end

    local rootPart = character:FindFirstChild("HumanoidRootPart")
    if rootPart then
        rootPart.Anchored = false
        -- Move slightly out of hiding spot
        rootPart.CFrame = rootPart.CFrame + rootPart.CFrame.LookVector * 3
    end

    ReplicatedStorage.Events.ExitedHiding:FireClient(player)
end

-- Creature detection - hiding isn't perfect
local function canCreatureDetectHiddenPlayer(creature, spot)
    -- Creature can detect if:
    -- 1. Very close (within 5 studs)
    -- 2. Player entered recently (within 3 seconds)
    -- 3. Player is making noise

    local distance = (creature.rootPart.Position - spot.part.Position).Magnitude

    if distance < 5 then
        -- Close inspection - 50% chance to detect
        return math.random() < 0.5
    end

    return false
end

-- Setup existing spots
for _, spot in ipairs(CollectionService:GetTagged("HidingSpot")) do
    setupHidingSpot(spot)
end

CollectionService:GetInstanceAddedSignal("HidingSpot"):Connect(setupHidingSpot)
```

## Interactive Objects

Objects that players can examine or interact with:

```lua
-- src/server/InteractiveObjects.server.luau
local CollectionService = game:GetService("CollectionService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local function setupInteractive(part)
    local interactionType = part:GetAttribute("InteractionType")
    local content = part:GetAttribute("Content")

    local prompt = Instance.new("ProximityPrompt")
    prompt.MaxActivationDistance = 6
    prompt.HoldDuration = 0.3
    prompt.Parent = part

    if interactionType == "note" then
        prompt.ActionText = "Read"
        prompt.ObjectText = part:GetAttribute("Title") or "Note"

        prompt.Triggered:Connect(function(player)
            ReplicatedStorage.Events.ShowNote:FireClient(player, {
                title = part:GetAttribute("Title"),
                content = content,
            })
        end)

    elseif interactionType == "examine" then
        prompt.ActionText = "Examine"
        prompt.ObjectText = part:GetAttribute("ObjectName") or "Object"

        prompt.Triggered:Connect(function(player)
            ReplicatedStorage.Events.ShowExamination:FireClient(player, {
                name = part:GetAttribute("ObjectName"),
                description = content,
                image = part:GetAttribute("ImageId"),
            })
        end)

    elseif interactionType == "switch" then
        prompt.ActionText = "Use"
        prompt.ObjectText = part:GetAttribute("SwitchName") or "Switch"

        local isOn = part:GetAttribute("IsOn") or false

        prompt.Triggered:Connect(function(player)
            isOn = not isOn
            part:SetAttribute("IsOn", isOn)

            -- Fire linked events
            local linkedId = part:GetAttribute("LinkedTo")
            if linkedId then
                ReplicatedStorage.Events.SwitchToggled:Fire(linkedId, isOn)
            end

            -- Play sound
            local sound = Instance.new("Sound")
            sound.SoundId = "rbxassetid://YOUR_SWITCH_SOUND"
            sound.Parent = part
            sound:Play()
        end)
    end
end

for _, obj in ipairs(CollectionService:GetTagged("Interactive")) do
    setupInteractive(obj)
end

CollectionService:GetInstanceAddedSignal("Interactive"):Connect(setupInteractive)
```

## Room Templates

Pre-designed room types for consistent horror feel:

```lua
-- src/shared/RoomTemplates.luau
local RoomTemplates = {}

RoomTemplates.CORRIDOR = {
    width = 8,
    height = 12,
    lightSpacing = 16,
    debrisDensity = 0.3,
    features = {"flickering_light", "pipe_sounds"},
}

RoomTemplates.STORAGE = {
    minSize = Vector3.new(16, 12, 16),
    maxSize = Vector3.new(32, 12, 32),
    shelving = true,
    debrisDensity = 0.5,
    hidingSpots = {"locker", "behind_shelves"},
    features = {"single_light", "dripping_water"},
}

RoomTemplates.OFFICE = {
    size = Vector3.new(24, 12, 24),
    furniture = {"desk", "chair", "filing_cabinet"},
    interactives = {"computer", "phone", "notes"},
    lightType = "fluorescent",
    features = {"computer_hum", "flickering_monitor"},
}

RoomTemplates.MEDICAL = {
    size = Vector3.new(32, 12, 24),
    furniture = {"examination_table", "cabinet", "sink"},
    loot = {"medkit", "bandage", "syringe"},
    lightType = "harsh_white",
    features = {"medical_equipment_beeps", "blood_stains"},
}

RoomTemplates.GENERATOR = {
    size = Vector3.new(24, 16, 24),
    machinery = true,
    loudAmbient = true,
    objective = "power_restore",
    features = {"loud_hum", "steam_vents", "warning_lights"},
}

return RoomTemplates
```

## Vibe Coding Level Design

When working with AI on environment design:

> "Create a modular corridor system with 8-stud grid snapping and door connections"

> "Add a hiding spot system where players become invisible but creatures can detect them if too close"

> "Build a room template for an abandoned medical bay with examination tables, cabinets, and flickering lights"

> "Implement an interactive note system that displays text overlays when players examine objects"

The AI handles the Roblox specifics—CFrames, tweens, collision groups. You focus on the spatial experience.

## Testing Environments

Walk through your spaces as a player:

1. **Sightline check** - Can you see too far? Too little?
2. **Navigation check** - Can you find your way? Get lost in the right places?
3. **Audio check** - Does sound tell a story? Create uncertainty?
4. **Pacing check** - Are there moments of relief between tension?

## Next Steps

With environments built, we have all the pieces for a single-player horror experience. But horror is amplified with others. In the next chapter, we'll add multiplayer systems that let friends survive—or die—together.
