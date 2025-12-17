# Polish and Publishing

A game that works isn't the same as a game that shines. Polish transforms functional systems into memorable experiences. This final chapter covers the finishing touches that separate amateur projects from professional releases.

## UI/UX Polish

Horror UI should be minimal but effective—never break immersion.

### Diegetic UI

Information integrated into the game world:

```lua
-- src/client/DiegeticUI.client.luau
-- Health shown through visual effects, not bars

local Players = game:GetService("Players")
local Lighting = game:GetService("Lighting")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer

-- Vignette effect for low health
local vignette = Instance.new("ImageLabel")
vignette.Name = "HealthVignette"
vignette.Size = UDim2.new(1, 0, 1, 0)
vignette.Position = UDim2.new(0, 0, 0, 0)
vignette.BackgroundTransparency = 1
vignette.Image = "rbxassetid://YOUR_VIGNETTE_IMAGE"
vignette.ImageColor3 = Color3.fromRGB(100, 0, 0)
vignette.ImageTransparency = 1
vignette.ZIndex = 100

local screenGui = Instance.new("ScreenGui")
screenGui.Name = "DiegeticEffects"
screenGui.IgnoreGuiInset = true
screenGui.ResetOnSpawn = false
screenGui.Parent = player.PlayerGui

vignette.Parent = screenGui

-- Color correction for damage
local colorCorrection = Lighting:FindFirstChild("ColorCorrectionEffect")
if not colorCorrection then
    colorCorrection = Instance.new("ColorCorrectionEffect")
    colorCorrection.Parent = Lighting
end

local function updateHealthEffects(healthPercent)
    -- Vignette intensity
    local vignetteAlpha = math.clamp(1 - healthPercent, 0, 0.7)
    vignette.ImageTransparency = 1 - vignetteAlpha

    -- Desaturation at low health
    colorCorrection.Saturation = -0.5 * (1 - healthPercent)

    -- Pulse effect at critical health
    if healthPercent < 0.25 then
        local pulse = TweenService:Create(vignette, TweenInfo.new(0.8, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), {
            ImageTransparency = 0.3
        })
        pulse:Play()
    end
end

game.ReplicatedStorage.Events.HealthChanged.OnClientEvent:Connect(function(health, maxHealth)
    updateHealthEffects(health / maxHealth)
end)
```

### Screen Shake

Camera shake for impact:

```lua
-- src/client/ScreenShake.client.luau
local RunService = game:GetService("RunService")
local camera = workspace.CurrentCamera

local ScreenShake = {
    shakes = {},
}

function ScreenShake.add(intensity, duration, frequency)
    local shake = {
        intensity = intensity,
        duration = duration,
        frequency = frequency or 20,
        startTime = tick(),
    }

    table.insert(ScreenShake.shakes, shake)
    return shake
end

function ScreenShake.addImpact(intensity)
    -- Single impact shake that decays
    ScreenShake.add(intensity, 0.3, 30)
end

function ScreenShake.addTrauma(amount)
    -- Accumulating trauma that decays over time
    ScreenShake.add(amount, 2, 15)
end

RunService.RenderStepped:Connect(function(dt)
    local totalOffset = Vector3.new(0, 0, 0)
    local totalRotation = Vector3.new(0, 0, 0)

    for i = #ScreenShake.shakes, 1, -1 do
        local shake = ScreenShake.shakes[i]
        local elapsed = tick() - shake.startTime

        if elapsed >= shake.duration then
            table.remove(ScreenShake.shakes, i)
        else
            -- Calculate decay
            local decay = 1 - (elapsed / shake.duration)
            local intensity = shake.intensity * decay

            -- Perlin noise for smooth shake
            local time = tick() * shake.frequency
            local offsetX = (math.noise(time, 0) * 2 - 1) * intensity
            local offsetY = (math.noise(0, time) * 2 - 1) * intensity
            local rotationZ = (math.noise(time, time) * 2 - 1) * intensity * 0.5

            totalOffset = totalOffset + Vector3.new(offsetX, offsetY, 0)
            totalRotation = totalRotation + Vector3.new(0, 0, rotationZ)
        end
    end

    -- Apply to camera
    if totalOffset.Magnitude > 0 then
        camera.CFrame = camera.CFrame * CFrame.new(totalOffset) * CFrame.Angles(
            math.rad(totalRotation.X),
            math.rad(totalRotation.Y),
            math.rad(totalRotation.Z)
        )
    end
end)

return ScreenShake
```

### Horror-Appropriate Fonts

```lua
-- Avoid playful fonts. Use:
-- Enum.Font.SourceSans (clean, neutral)
-- Enum.Font.SourceSansBold (emphasis)
-- Enum.Font.Code (terminals, logs)
-- Enum.Font.Highway (signs, warnings)

local function createHorrorText(text, parent)
    local label = Instance.new("TextLabel")
    label.Font = Enum.Font.SourceSans
    label.TextColor3 = Color3.fromRGB(200, 200, 200)  -- Slightly off-white
    label.TextSize = 18
    label.BackgroundTransparency = 1
    label.Text = text
    label.Parent = parent
    return label
end
```

## Sound Polish

Sound sells horror. Every interaction needs audio feedback.

### Footstep System

Different surfaces, different sounds:

```lua
-- src/client/Footsteps.client.luau
local Players = game:GetService("Players")
local SoundService = game:GetService("SoundService")
local RunService = game:GetService("RunService")

local player = Players.LocalPlayer

local FOOTSTEP_SOUNDS = {
    Concrete = { "rbxassetid://CONCRETE_1", "rbxassetid://CONCRETE_2" },
    Metal = { "rbxassetid://METAL_1", "rbxassetid://METAL_2" },
    Wood = { "rbxassetid://WOOD_1", "rbxassetid://WOOD_2" },
    Grass = { "rbxassetid://GRASS_1", "rbxassetid://GRASS_2" },
    Water = { "rbxassetid://SPLASH_1", "rbxassetid://SPLASH_2" },
}

local lastStep = 0
local stepInterval = 0.4

local function getMaterialUnderFoot()
    local character = player.Character
    if not character then return "Concrete" end

    local rootPart = character:FindFirstChild("HumanoidRootPart")
    if not rootPart then return "Concrete" end

    local rayResult = workspace:Raycast(
        rootPart.Position,
        Vector3.new(0, -5, 0)
    )

    if rayResult then
        local material = rayResult.Material.Name

        -- Map Roblox materials to our sound categories
        if material == "Metal" or material == "DiamondPlate" then
            return "Metal"
        elseif material == "Wood" or material == "WoodPlanks" then
            return "Wood"
        elseif material == "Grass" or material == "LeafyGrass" then
            return "Grass"
        elseif material == "Water" then
            return "Water"
        end
    end

    return "Concrete"
end

local function playFootstep()
    local material = getMaterialUnderFoot()
    local sounds = FOOTSTEP_SOUNDS[material] or FOOTSTEP_SOUNDS.Concrete

    local soundId = sounds[math.random(#sounds)]

    local sound = Instance.new("Sound")
    sound.SoundId = soundId
    sound.Volume = 0.3
    sound.PlaybackSpeed = 0.9 + math.random() * 0.2  -- Slight variation
    sound.Parent = player.Character.HumanoidRootPart
    sound:Play()
    sound.Ended:Connect(function() sound:Destroy() end)
end

RunService.Heartbeat:Connect(function()
    local character = player.Character
    if not character then return end

    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then return end

    local isMoving = humanoid.MoveDirection.Magnitude > 0.1
    local isRunning = humanoid.WalkSpeed > 16

    if isMoving then
        stepInterval = isRunning and 0.3 or 0.5

        if tick() - lastStep >= stepInterval then
            playFootstep()
            lastStep = tick()
        end
    end
end)
```

### Ambient Sound Layers

```lua
-- src/client/AmbientSounds.client.luau
local function createAmbientLayer(name, soundId, volume, pitch)
    local sound = Instance.new("Sound")
    sound.Name = name
    sound.SoundId = soundId
    sound.Volume = volume or 0.3
    sound.PlaybackSpeed = pitch or 1
    sound.Looped = true
    sound.Parent = game.SoundService
    sound:Play()
    return sound
end

-- Base layers (always playing)
createAmbientLayer("BaseDrone", "rbxassetid://YOUR_DRONE", 0.2)
createAmbientLayer("Wind", "rbxassetid://YOUR_WIND", 0.15)

-- Tension layers (fade in based on threat)
local tensionLayer = createAmbientLayer("Tension", "rbxassetid://YOUR_TENSION", 0)
local heartbeatLayer = createAmbientLayer("Heartbeat", "rbxassetid://YOUR_HEARTBEAT", 0)

local function updateTensionAudio(threatLevel)
    tensionLayer.Volume = threatLevel * 0.4
    heartbeatLayer.Volume = math.max(0, threatLevel - 0.5) * 0.6
    heartbeatLayer.PlaybackSpeed = 0.8 + threatLevel * 0.4
end

game.ReplicatedStorage.Events.ThreatLevelChanged.OnClientEvent:Connect(updateTensionAudio)
```

## Performance Optimization

Horror games need consistent frame rates—stuttering breaks immersion.

### Instance Streaming

For large maps:

```lua
-- In default.project.json or via Studio
-- Enable StreamingEnabled in Workspace properties

-- Server-side streaming configuration
workspace.StreamingEnabled = true
workspace.StreamingMinRadius = 64   -- Minimum loaded radius
workspace.StreamingTargetRadius = 256  -- Target loaded radius
workspace.StreamingPauseMode = Enum.StreamingPauseMode.ClientPhysicsPause
```

### LOD (Level of Detail)

```lua
-- src/server/LODManager.server.luau
local Players = game:GetService("Players")
local RunService = game:GetService("RunService")

local LOD_DISTANCES = {
    high = 50,
    medium = 100,
    low = 200,
}

local function updateLOD(part, distance)
    if distance < LOD_DISTANCES.high then
        -- Full detail
        part.Material = part:GetAttribute("OriginalMaterial") or part.Material
    elseif distance < LOD_DISTANCES.medium then
        -- Medium detail
        part.Material = Enum.Material.SmoothPlastic
    else
        -- Low detail
        part.Material = Enum.Material.SmoothPlastic
        -- Could also swap models here
    end
end

-- Tag parts with "LODEnabled" to optimize them
local CollectionService = game:GetService("CollectionService")

RunService.Heartbeat:Connect(function()
    for _, player in ipairs(Players:GetPlayers()) do
        local character = player.Character
        if not character then continue end

        local rootPart = character:FindFirstChild("HumanoidRootPart")
        if not rootPart then continue end

        for _, part in ipairs(CollectionService:GetTagged("LODEnabled")) do
            local distance = (part.Position - rootPart.Position).Magnitude
            updateLOD(part, distance)
        end
    end
end)
```

### Efficient Raycasting

```lua
-- Bad: Creating new RaycastParams every frame
local function badRaycast()
    local params = RaycastParams.new()  -- Allocates every call
    params.FilterType = Enum.RaycastFilterType.Exclude
    params.FilterDescendantsInstances = {player.Character}
    return workspace:Raycast(origin, direction, params)
end

-- Good: Reuse RaycastParams
local cachedParams = RaycastParams.new()
cachedParams.FilterType = Enum.RaycastFilterType.Exclude

local function goodRaycast(origin, direction, ignoreList)
    cachedParams.FilterDescendantsInstances = ignoreList
    return workspace:Raycast(origin, direction, cachedParams)
end
```

## Testing Checklist

Before publishing, verify:

### Gameplay
- [ ] Tutorial/onboarding works
- [ ] All objectives completable
- [ ] Creature AI behaves correctly
- [ ] Hiding spots function
- [ ] Items spawn and can be picked up
- [ ] Doors open/close/lock correctly
- [ ] Multiplayer sync works
- [ ] Revival system functions
- [ ] Death and respawn work

### Technical
- [ ] No script errors in output
- [ ] Frame rate stable (60+ FPS on mid-range devices)
- [ ] Memory usage reasonable
- [ ] Loading time acceptable
- [ ] Mobile controls work (if supported)

### Audio
- [ ] All sounds play
- [ ] Volume levels balanced
- [ ] No audio clipping
- [ ] Ambient sounds loop seamlessly

### Visual
- [ ] Lighting looks correct
- [ ] No z-fighting or visual glitches
- [ ] UI readable at all resolutions
- [ ] Effects don't obscure gameplay

## Publishing to Roblox

### Game Settings

Configure in Game Settings:

```
Basic Info:
- Name: Your game name
- Description: Hook + what the game is + call to action
- Genre: Horror (important for discovery)
- Playable Devices: Desktop, Phone, Tablet, Console

Permissions:
- Who Can Play: Public (when ready)
- Voice Chat: Consider for immersion

Monetization:
- Enable Private Servers (good for horror co-op)
- Consider Game Passes for cosmetics
```

### Description Template

```
[HOOK] Can you survive the night?

[WHAT IT IS]
A survival horror experience for 1-4 players. Explore the abandoned facility,
gather supplies, and escape before IT finds you.

[FEATURES]
- Intelligent creature AI that hunts by sight and sound
- Resource management (flashlight batteries, health items)
- Cooperative multiplayer with revival system
- Multiple objectives and endings

[CONTROLS]
WASD - Move
Shift - Run
F - Flashlight
E - Interact
Tab - Inventory

[UPDATES]
v1.0 - Initial release

[CREDITS]
Created with Rojo + Claude Code
```

### Thumbnails and Icons

Horror thumbnails should:
- Show atmosphere (dark, foggy, mysterious)
- Hint at threat without revealing everything
- Use contrasting colors for visibility
- Include game title clearly

```lua
-- Thumbnail dimensions: 1920x1080 (16:9)
-- Icon dimensions: 512x512

-- Take screenshots in-game using Studio's built-in tools
-- Or create promotional art separately
```

### Marketing

1. **Before launch**: Build anticipation on Roblox groups, Discord
2. **Launch day**: Post everywhere, ask friends to play
3. **Post-launch**: Respond to feedback, update regularly

## Monetization Ethics

Horror games can monetize without being predatory:

**Good monetization:**
- Cosmetic items (character skins, effects)
- Private servers for friends
- DLC content (new maps, creatures)
- One-time game passes

**Avoid:**
- Pay-to-win (buying survival items)
- Loot boxes with random rewards
- Energy systems that limit play
- Paywalled core features

## Post-Launch

Publishing is the beginning, not the end:

### Analytics

Track what matters:
- Play time per session
- Where players quit
- Which objectives cause issues
- Multiplayer vs solo preference

### Updates

Regular updates keep players coming back:
- Bug fixes (priority one)
- Balance adjustments
- New content (maps, items, creatures)
- Community-requested features

### Community

Build a community around your game:
- Roblox group for announcements
- Discord for feedback
- Respond to comments and reviews

## Vibe Coding Polish

When polishing with AI:

> "Add screen shake when the player takes damage, with intensity based on damage amount"

> "Create a footstep system that plays different sounds based on floor material"

> "Implement a vignette effect that intensifies as player health decreases"

> "Add ambient sound layers that crossfade based on threat level"

Polish is iterative. Let AI generate the systems, then tune until it feels right.

## Final Thoughts

You've built a survival horror game. From project setup to creature AI, from atmospheric lighting to multiplayer systems, from UI polish to publishing—every piece is in place.

But the systems aren't the game. The *experience* is the game. Your creature isn't scary because it has pathfinding—it's scary because you tuned when it appears, how it moves, what sounds it makes.

Keep iterating. Keep playtesting. Keep asking: "Is this scary?"

When the answer is yes, you've made something special.

Now go terrify some players.
