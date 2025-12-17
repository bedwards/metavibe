# Creating Atmosphere

Horror games live and die by atmosphere. A dark corridor is just a dark corridor—until the lighting flickers, the music shifts, and you hear something breathing behind you.

This chapter covers the technical systems that create dread.

## Lighting for Horror

Roblox's Lighting service controls the entire visual mood. For horror, we want:

- **Low ambient light** - Players can't see everything clearly
- **Fog** - Limits visibility, creates uncertainty
- **Strategic light sources** - Draw attention, create shadows
- **Color grading** - Desaturated, cold tones

### Base Horror Lighting

In your project file or via script:

```lua
-- src/server/Atmosphere.server.luau
local Lighting = game:GetService("Lighting")

-- Base horror settings
Lighting.Brightness = 0.3
Lighting.Ambient = Color3.fromRGB(15, 15, 25)
Lighting.OutdoorAmbient = Color3.fromRGB(20, 20, 30)
Lighting.FogEnd = 150
Lighting.FogStart = 0
Lighting.FogColor = Color3.fromRGB(20, 20, 25)

-- Color correction for desaturated look
local colorCorrection = Instance.new("ColorCorrectionEffect")
colorCorrection.Saturation = -0.3
colorCorrection.Contrast = 0.1
colorCorrection.TintColor = Color3.fromRGB(200, 200, 220)
colorCorrection.Parent = Lighting

-- Bloom for light sources to pop
local bloom = Instance.new("BloomEffect")
bloom.Intensity = 0.5
bloom.Size = 24
bloom.Threshold = 0.8
bloom.Parent = Lighting
```

### Dynamic Lighting Changes

Horror isn't static. Lights should flicker, areas should get darker as danger approaches:

```lua
-- src/shared/LightingUtils.luau
local TweenService = game:GetService("TweenService")
local Lighting = game:GetService("Lighting")

local LightingUtils = {}

function LightingUtils.transitionTo(settings, duration)
    local tweenInfo = TweenInfo.new(duration, Enum.EasingStyle.Sine)

    for property, value in pairs(settings) do
        local tween = TweenService:Create(Lighting, tweenInfo, {
            [property] = value
        })
        tween:Play()
    end
end

function LightingUtils.flickerLight(light, duration, intensity)
    local original = light.Brightness
    local flickerCount = math.floor(duration / 0.1)

    task.spawn(function()
        for i = 1, flickerCount do
            light.Brightness = original * (math.random() * intensity)
            task.wait(0.05 + math.random() * 0.1)
        end
        light.Brightness = original
    end)
end

function LightingUtils.setThreatLevel(level)
    -- 0 = safe, 1 = maximum danger
    level = math.clamp(level, 0, 1)

    local settings = {
        FogEnd = 200 - (level * 100),  -- Fog closes in
        Brightness = 0.5 - (level * 0.3),  -- Gets darker
    }

    LightingUtils.transitionTo(settings, 2)
end

return LightingUtils
```

## Day/Night Cycles

Many horror games use time of day to pace tension. Daytime for exploration, nighttime for survival.

```lua
-- src/server/DayNight.server.luau
local Lighting = game:GetService("Lighting")
local Config = require(game.ReplicatedStorage.Shared.Config)

local DayNight = {
    currentTime = 6,  -- Start at 6 AM
    isPaused = false,
}

local TIME_PHASES = {
    { hour = 6, name = "Dawn", brightness = 0.5, fogEnd = 300 },
    { hour = 12, name = "Day", brightness = 1, fogEnd = 500 },
    { hour = 18, name = "Dusk", brightness = 0.4, fogEnd = 200 },
    { hour = 22, name = "Night", brightness = 0.1, fogEnd = 100 },
    { hour = 2, name = "DeadOfNight", brightness = 0.05, fogEnd = 50 },
}

function DayNight.getCurrentPhase()
    local hour = DayNight.currentTime
    for i = #TIME_PHASES, 1, -1 do
        if hour >= TIME_PHASES[i].hour then
            return TIME_PHASES[i]
        end
    end
    return TIME_PHASES[#TIME_PHASES]  -- Wrap to dead of night
end

function DayNight.update()
    if DayNight.isPaused then return end

    -- Calculate time increment
    local isDay = DayNight.currentTime >= 6 and DayNight.currentTime < 22
    local cycleDuration = isDay and Config.DAY_LENGTH or Config.NIGHT_LENGTH
    local hoursInPhase = isDay and 16 or 8
    local timePerSecond = hoursInPhase / cycleDuration

    DayNight.currentTime = (DayNight.currentTime + timePerSecond) % 24
    Lighting.ClockTime = DayNight.currentTime

    local phase = DayNight.getCurrentPhase()
    -- Smoothly transition lighting
    Lighting.Brightness = phase.brightness
    Lighting.FogEnd = phase.fogEnd
end

-- Run update loop
task.spawn(function()
    while true do
        DayNight.update()
        task.wait(1)
    end
end)

return DayNight
```

## Sound Design

Sound is half of horror. Visuals tell you what's there; sound tells you what *might* be there.

### Ambient Sound Layers

Layer multiple sound sources:

1. **Base ambience** - Constant low drone, wind, distant sounds
2. **Environmental** - Dripping water, creaking wood, electrical hum
3. **Dynamic stingers** - Sharp sounds when danger appears
4. **Music** - Tension-building tracks that respond to game state

```lua
-- src/client/SoundManager.client.luau
local SoundService = game:GetService("SoundService")

local SoundManager = {
    layers = {},
}

function SoundManager.createLayer(name, soundId, properties)
    local sound = Instance.new("Sound")
    sound.SoundId = soundId
    sound.Name = name
    sound.Looped = properties.looped or false
    sound.Volume = properties.volume or 0.5
    sound.Parent = SoundService

    SoundManager.layers[name] = sound
    return sound
end

function SoundManager.playStinger(soundId, volume)
    local stinger = Instance.new("Sound")
    stinger.SoundId = soundId
    stinger.Volume = volume or 1
    stinger.Parent = SoundService
    stinger:Play()
    stinger.Ended:Connect(function()
        stinger:Destroy()
    end)
end

function SoundManager.setThreatLevel(level)
    -- Crossfade between calm and tense ambience
    local calmLayer = SoundManager.layers["Calm"]
    local tenseLayer = SoundManager.layers["Tense"]

    if calmLayer then
        calmLayer.Volume = (1 - level) * 0.5
    end
    if tenseLayer then
        tenseLayer.Volume = level * 0.7
    end
end

-- Initialize base layers
SoundManager.createLayer("Calm", "rbxassetid://YOUR_CALM_AMBIENT", {
    looped = true,
    volume = 0.5,
})
SoundManager.createLayer("Tense", "rbxassetid://YOUR_TENSE_AMBIENT", {
    looped = true,
    volume = 0,
})

-- Start playback
for _, sound in pairs(SoundManager.layers) do
    sound:Play()
end

return SoundManager
```

### Positional Audio

Sounds in 3D space are crucial for horror. Players should hear the creature before they see it:

```lua
function SoundManager.playAtPosition(soundId, position, properties)
    local part = Instance.new("Part")
    part.Anchored = true
    part.CanCollide = false
    part.Transparency = 1
    part.Position = position
    part.Parent = workspace

    local sound = Instance.new("Sound")
    sound.SoundId = soundId
    sound.RollOffMode = Enum.RollOffMode.Linear
    sound.RollOffMinDistance = properties.minDistance or 10
    sound.RollOffMaxDistance = properties.maxDistance or 100
    sound.Volume = properties.volume or 1
    sound.Parent = part

    sound:Play()
    sound.Ended:Connect(function()
        part:Destroy()
    end)

    return sound
end
```

## Environmental Storytelling

The environment itself tells the story. Players should discover what happened through:

- **Visual details** - Blood stains, claw marks, abandoned items
- **Notes and logs** - Text that reveals backstory
- **Environmental changes** - Areas that look different after events
- **Interactive objects** - Things players can examine

```lua
-- src/server/Discovery.server.luau
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Discovery = {
    foundItems = {},  -- Track per-player
}

local DISCOVERABLE_ITEMS = {
    {
        id = "note_1",
        type = "note",
        title = "Researcher's Log",
        content = "Day 15. The readings are off the charts. Something is wrong with the samples...",
    },
    {
        id = "audio_1",
        type = "audio",
        title = "Emergency Recording",
        soundId = "rbxassetid://YOUR_AUDIO",
    },
}

function Discovery.onItemDiscovered(player, itemId)
    if not Discovery.foundItems[player] then
        Discovery.foundItems[player] = {}
    end

    if Discovery.foundItems[player][itemId] then
        return false  -- Already found
    end

    Discovery.foundItems[player][itemId] = true

    -- Fire event to client
    local item = nil
    for _, i in ipairs(DISCOVERABLE_ITEMS) do
        if i.id == itemId then
            item = i
            break
        end
    end

    if item then
        ReplicatedStorage.Events.ItemDiscovered:FireClient(player, item)
    end

    return true
end

return Discovery
```

## Vibe Coding Atmosphere

When working with AI on atmosphere systems:

> "Create a lighting system that gradually gets darker and foggier as threat level increases from 0 to 1"

> "Implement a sound manager with layered ambient sounds that crossfade based on game state"

> "Add a day/night cycle where nights are shorter but much more dangerous"

The AI excels at these systems because they're well-defined: input (threat level, time) → output (lighting, sound). Let it handle the math while you focus on the *feel*.

## Testing Atmosphere

Atmosphere is subjective. Test with:

1. **Screenshots at different times** - Do key moments look right?
2. **Playtests with fresh eyes** - Does it feel tense to someone who hasn't seen it 100 times?
3. **Audio-only tests** - Close your eyes and listen. Does the sound alone create unease?

## Next Steps

With the atmosphere systems in place, we need something to be afraid of. In the next chapter, we'll build the creature AI that stalks the player through our carefully crafted darkness.
