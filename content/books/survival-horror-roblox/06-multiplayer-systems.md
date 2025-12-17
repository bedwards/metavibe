# Multiplayer Systems

Horror alone is terrifying. Horror together is a shared experience that bonds players through fear. But multiplayer horror introduces unique design challenges—coordinating players, sharing resources, and keeping tension when safety comes in numbers.

This chapter covers building co-op survival horror in Roblox.

## The Multiplayer Horror Paradox

More players means more safety. This seems to undermine horror. But smart design turns multiplayer into an amplifier:

- **Shared vulnerability** - If one player dies, everyone suffers
- **Resource splitting** - Items must be shared, creating tension
- **Communication** - Coordinating requires noise, which attracts danger
- **Separation** - The creature can split the group

## Player Data Management

Server-authoritative data prevents cheating and ensures sync:

```lua
-- src/server/PlayerData.server.luau
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Inventory = require(ReplicatedStorage.Shared.Inventory)
local PlayerStats = require(ReplicatedStorage.Shared.PlayerStats)

local PlayerData = {
    players = {},
}

function PlayerData.initPlayer(player)
    PlayerData.players[player] = {
        stats = PlayerStats.new(),
        inventory = Inventory.new(10, 20),  -- 10 slots, 20 weight
        isAlive = true,
        spawnTime = tick(),
        deathCount = 0,
    }

    -- Give starting items
    PlayerData.players[player].inventory:addItem("flashlight", 1)
    PlayerData.players[player].inventory:addItem("battery", 2)

    -- Sync to client
    PlayerData.syncToClient(player)
end

function PlayerData.getPlayerData(player)
    return PlayerData.players[player]
end

function PlayerData.syncToClient(player)
    local data = PlayerData.players[player]
    if not data then return end

    -- Send stats
    ReplicatedStorage.Events.StatsUpdated:FireClient(player, {
        health = data.stats.health,
        maxHealth = data.stats.maxHealth,
        stamina = data.stats.stamina,
        maxStamina = data.stats.maxStamina,
    })

    -- Send inventory
    ReplicatedStorage.Events.InventoryUpdated:FireClient(
        player,
        data.inventory.slots,
        data.inventory:getCurrentWeight(),
        data.inventory.maxWeight
    )
end

function PlayerData.syncToAll()
    for player in pairs(PlayerData.players) do
        PlayerData.syncToClient(player)
    end
end

-- Player lifecycle
Players.PlayerAdded:Connect(function(player)
    PlayerData.initPlayer(player)

    player.CharacterAdded:Connect(function(character)
        local data = PlayerData.players[player]
        if data then
            data.isAlive = true

            -- Apply stats to humanoid
            local humanoid = character:WaitForChild("Humanoid")
            humanoid.MaxHealth = data.stats.maxHealth
            humanoid.Health = data.stats.health

            humanoid.Died:Connect(function()
                PlayerData.onPlayerDeath(player)
            end)
        end
    end)
end)

Players.PlayerRemoving:Connect(function(player)
    PlayerData.players[player] = nil
end)

function PlayerData.onPlayerDeath(player)
    local data = PlayerData.players[player]
    if not data then return end

    data.isAlive = false
    data.deathCount = data.deathCount + 1

    -- Notify all players
    for otherPlayer in pairs(PlayerData.players) do
        ReplicatedStorage.Events.PlayerDied:FireClient(otherPlayer, player.Name)
    end

    -- Check for team wipe
    local anyAlive = false
    for _, pData in pairs(PlayerData.players) do
        if pData.isAlive then
            anyAlive = true
            break
        end
    end

    if not anyAlive then
        PlayerData.onTeamWipe()
    end
end

function PlayerData.onTeamWipe()
    -- Game over
    for player in pairs(PlayerData.players) do
        ReplicatedStorage.Events.GameOver:FireClient(player, {
            reason = "Everyone died",
            stats = PlayerData.getGameStats(),
        })
    end
end

function PlayerData.getGameStats()
    local stats = {
        survivalTime = 0,
        totalDeaths = 0,
        itemsCollected = 0,
    }

    for _, data in pairs(PlayerData.players) do
        stats.totalDeaths = stats.totalDeaths + data.deathCount
    end

    return stats
end

return PlayerData
```

## Team Communication

In-game voice or text creates immersion:

```lua
-- src/server/TeamChat.server.luau
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TextService = game:GetService("TextService")

local PROXIMITY_RANGE = 50  -- Studs for proximity chat
local WHISPER_RANGE = 15    -- Studs for whisper

local function getDistance(player1, player2)
    local char1 = player1.Character
    local char2 = player2.Character
    if not char1 or not char2 then return math.huge end

    local root1 = char1:FindFirstChild("HumanoidRootPart")
    local root2 = char2:FindFirstChild("HumanoidRootPart")
    if not root1 or not root2 then return math.huge end

    return (root1.Position - root2.Position).Magnitude
end

local function filterMessage(player, message)
    local success, result = pcall(function()
        return TextService:FilterStringAsync(message, player.UserId)
    end)

    if success then
        return result:GetNonChatStringForBroadcastAsync()
    end
    return "[filtered]"
end

-- Proximity chat - only nearby players hear
ReplicatedStorage.Events.SendProximityMessage.OnServerEvent:Connect(function(sender, message)
    local filtered = filterMessage(sender, message)

    for _, receiver in ipairs(Players:GetPlayers()) do
        local distance = getDistance(sender, receiver)

        if distance <= PROXIMITY_RANGE then
            -- Volume based on distance
            local volume = 1 - (distance / PROXIMITY_RANGE)

            ReplicatedStorage.Events.ReceiveProximityMessage:FireClient(
                receiver,
                sender.Name,
                filtered,
                volume
            )
        end
    end

    -- IMPORTANT: Proximity chat attracts creature
    notifyCreatureOfNoise(sender, "voice", PROXIMITY_RANGE * 0.5)
end)

-- Whisper - very close range, quieter
ReplicatedStorage.Events.SendWhisper.OnServerEvent:Connect(function(sender, message)
    local filtered = filterMessage(sender, message)

    for _, receiver in ipairs(Players:GetPlayers()) do
        local distance = getDistance(sender, receiver)

        if distance <= WHISPER_RANGE then
            ReplicatedStorage.Events.ReceiveWhisper:FireClient(
                receiver,
                sender.Name,
                filtered
            )
        end
    end

    -- Whispers make less noise
    notifyCreatureOfNoise(sender, "whisper", WHISPER_RANGE * 0.3)
end)

-- Radio - global but uses batteries
ReplicatedStorage.Events.SendRadioMessage.OnServerEvent:Connect(function(sender, message)
    local playerData = getPlayerData(sender)
    if not playerData.inventory:hasItem("radio") then
        return
    end

    local filtered = filterMessage(sender, message)

    for _, receiver in ipairs(Players:GetPlayers()) do
        if receiver ~= sender and getPlayerData(receiver).inventory:hasItem("radio") then
            ReplicatedStorage.Events.ReceiveRadioMessage:FireClient(
                receiver,
                sender.Name,
                filtered
            )
        end
    end

    -- Radios are LOUD
    notifyCreatureOfNoise(sender, "radio", 100)
end)
```

## Item Trading

Players should be able to share resources:

```lua
-- src/server/Trading.server.luau
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local TRADE_RANGE = 10

local activeTrades = {}

local function startTrade(initiator, target)
    local initiatorRoot = initiator.Character and initiator.Character:FindFirstChild("HumanoidRootPart")
    local targetRoot = target.Character and target.Character:FindFirstChild("HumanoidRootPart")

    if not initiatorRoot or not targetRoot then return end

    local distance = (initiatorRoot.Position - targetRoot.Position).Magnitude
    if distance > TRADE_RANGE then
        ReplicatedStorage.Events.TradeFailed:FireClient(initiator, "Too far away")
        return
    end

    local tradeId = initiator.UserId .. "_" .. target.UserId .. "_" .. tick()

    activeTrades[tradeId] = {
        initiator = initiator,
        target = target,
        initiatorItems = {},
        targetItems = {},
        initiatorReady = false,
        targetReady = false,
    }

    ReplicatedStorage.Events.TradeRequest:FireClient(target, initiator.Name, tradeId)
    ReplicatedStorage.Events.TradeStarted:FireClient(initiator, target.Name, tradeId)
end

local function acceptTrade(player, tradeId)
    local trade = activeTrades[tradeId]
    if not trade then return end

    if player ~= trade.target then return end

    ReplicatedStorage.Events.TradeAccepted:FireClient(trade.initiator, tradeId)
    ReplicatedStorage.Events.TradeAccepted:FireClient(trade.target, tradeId)
end

local function addItemToTrade(player, tradeId, itemId, quantity)
    local trade = activeTrades[tradeId]
    if not trade then return end

    local playerData = getPlayerData(player)
    if not playerData.inventory:hasItem(itemId, quantity) then
        return
    end

    local itemList
    if player == trade.initiator then
        itemList = trade.initiatorItems
    elseif player == trade.target then
        itemList = trade.targetItems
    else
        return
    end

    table.insert(itemList, { itemId = itemId, quantity = quantity })

    -- Sync to both players
    ReplicatedStorage.Events.TradeUpdated:FireClient(trade.initiator, tradeId, trade)
    ReplicatedStorage.Events.TradeUpdated:FireClient(trade.target, tradeId, trade)
end

local function confirmTrade(player, tradeId)
    local trade = activeTrades[tradeId]
    if not trade then return end

    if player == trade.initiator then
        trade.initiatorReady = true
    elseif player == trade.target then
        trade.targetReady = true
    end

    -- Both ready - execute trade
    if trade.initiatorReady and trade.targetReady then
        executeTrade(trade)
        activeTrades[tradeId] = nil
    end
end

local function executeTrade(trade)
    local initiatorData = getPlayerData(trade.initiator)
    local targetData = getPlayerData(trade.target)

    -- Remove items from initiator, add to target
    for _, item in ipairs(trade.initiatorItems) do
        if initiatorData.inventory:removeItem(item.itemId, item.quantity) then
            targetData.inventory:addItem(item.itemId, item.quantity)
        end
    end

    -- Remove items from target, add to initiator
    for _, item in ipairs(trade.targetItems) do
        if targetData.inventory:removeItem(item.itemId, item.quantity) then
            initiatorData.inventory:addItem(item.itemId, item.quantity)
        end
    end

    -- Sync inventories
    syncToClient(trade.initiator)
    syncToClient(trade.target)

    ReplicatedStorage.Events.TradeCompleted:FireClient(trade.initiator, tradeId)
    ReplicatedStorage.Events.TradeCompleted:FireClient(trade.target, tradeId)
end

-- Quick drop for emergencies
ReplicatedStorage.Events.DropItem.OnServerEvent:Connect(function(player, itemId, quantity)
    local playerData = getPlayerData(player)
    if not playerData.inventory:hasItem(itemId, quantity) then return end

    local character = player.Character
    if not character then return end

    local rootPart = character:FindFirstChild("HumanoidRootPart")
    if not rootPart then return end

    -- Remove from inventory
    playerData.inventory:removeItem(itemId, quantity)

    -- Spawn pickup in world
    local pickup = createPickup(itemId, quantity)
    pickup.Position = rootPart.Position + Vector3.new(0, 0, 3)
    pickup.Parent = workspace.Items

    syncToClient(player)
end)
```

## Player Revival

Downed players can be revived by teammates:

```lua
-- src/server/Revival.server.luau
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local REVIVAL_TIME = 5  -- Seconds to revive
local BLEEDOUT_TIME = 60  -- Seconds before permanent death

local downedPlayers = {}

local function onPlayerDowned(player)
    local character = player.Character
    if not character then return end

    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then return end

    -- Don't die immediately - go to downed state
    humanoid.Health = 1
    humanoid.WalkSpeed = 0
    humanoid.JumpPower = 0

    downedPlayers[player] = {
        downedAt = tick(),
        isBeingRevived = false,
        reviver = nil,
    }

    -- Play downed animation
    local animator = humanoid:FindFirstChildOfClass("Animator")
    if animator then
        local animation = Instance.new("Animation")
        animation.AnimationId = "rbxassetid://YOUR_DOWNED_ANIMATION"
        animator:LoadAnimation(animation):Play()
    end

    -- Notify all players
    for _, p in ipairs(Players:GetPlayers()) do
        ReplicatedStorage.Events.PlayerDowned:FireClient(p, player.Name)
    end

    -- Create revival prompt
    local prompt = Instance.new("ProximityPrompt")
    prompt.ActionText = "Revive"
    prompt.ObjectText = player.Name
    prompt.HoldDuration = REVIVAL_TIME
    prompt.RequiresLineOfSight = false
    prompt.MaxActivationDistance = 5
    prompt.Parent = character.HumanoidRootPart

    prompt.PromptButtonHoldBegan:Connect(function(reviver)
        downedPlayers[player].isBeingRevived = true
        downedPlayers[player].reviver = reviver
    end)

    prompt.PromptButtonHoldEnded:Connect(function()
        downedPlayers[player].isBeingRevived = false
        downedPlayers[player].reviver = nil
    end)

    prompt.Triggered:Connect(function(reviver)
        revivePlayer(player, reviver)
        prompt:Destroy()
    end)

    -- Bleedout timer
    task.spawn(function()
        while downedPlayers[player] do
            task.wait(1)

            local elapsed = tick() - downedPlayers[player].downedAt

            -- Sync bleedout timer to downed player
            local remaining = BLEEDOUT_TIME - elapsed
            ReplicatedStorage.Events.BleedoutTimer:FireClient(player, remaining)

            if elapsed >= BLEEDOUT_TIME then
                -- Permanent death
                permanentDeath(player)
                break
            end
        end
    end)
end

local function revivePlayer(player, reviver)
    if not downedPlayers[player] then return end

    local character = player.Character
    if not character then return end

    local humanoid = character:FindFirstChildOfClass("Humanoid")
    if not humanoid then return end

    -- Restore player
    humanoid.Health = humanoid.MaxHealth * 0.5  -- Revive at half health
    humanoid.WalkSpeed = 16
    humanoid.JumpPower = 50

    downedPlayers[player] = nil

    -- Notify all players
    for _, p in ipairs(Players:GetPlayers()) do
        ReplicatedStorage.Events.PlayerRevived:FireClient(p, player.Name, reviver.Name)
    end
end

local function permanentDeath(player)
    downedPlayers[player] = nil

    local character = player.Character
    if character then
        local humanoid = character:FindFirstChildOfClass("Humanoid")
        if humanoid then
            humanoid.Health = 0
        end
    end
end

-- Hook into damage system
ReplicatedStorage.Events.PlayerTakeDamage.OnServerEvent:Connect(function(player, amount)
    local playerData = getPlayerData(player)
    local character = player.Character
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")

    if humanoid and humanoid.Health - amount <= 0 then
        if not downedPlayers[player] then
            -- First down - go to downed state
            humanoid.Health = 1
            onPlayerDowned(player)
        end
    end
end)
```

## Spectating Dead Players

Dead players should be able to watch teammates:

```lua
-- src/client/Spectator.client.luau
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local UserInputService = game:GetService("UserInputService")

local player = Players.LocalPlayer
local camera = workspace.CurrentCamera

local isSpectating = false
local spectateTarget = nil
local spectateIndex = 1

local function getAlivePlayers()
    local alive = {}
    for _, p in ipairs(Players:GetPlayers()) do
        if p ~= player and p.Character and p.Character:FindFirstChildOfClass("Humanoid") then
            local humanoid = p.Character:FindFirstChildOfClass("Humanoid")
            if humanoid.Health > 0 then
                table.insert(alive, p)
            end
        end
    end
    return alive
end

local function startSpectating()
    isSpectating = true

    local alivePlayers = getAlivePlayers()
    if #alivePlayers == 0 then
        -- No one to spectate
        return
    end

    spectateTarget = alivePlayers[1]
    spectateIndex = 1

    camera.CameraType = Enum.CameraType.Custom
    camera.CameraSubject = spectateTarget.Character:FindFirstChildOfClass("Humanoid")

    -- Show spectate UI
    showSpectateUI(spectateTarget.Name)
end

local function cycleSpectateTarget(direction)
    local alivePlayers = getAlivePlayers()
    if #alivePlayers == 0 then return end

    spectateIndex = spectateIndex + direction
    if spectateIndex > #alivePlayers then
        spectateIndex = 1
    elseif spectateIndex < 1 then
        spectateIndex = #alivePlayers
    end

    spectateTarget = alivePlayers[spectateIndex]
    camera.CameraSubject = spectateTarget.Character:FindFirstChildOfClass("Humanoid")
    updateSpectateUI(spectateTarget.Name)
end

local function stopSpectating()
    isSpectating = false
    spectateTarget = nil

    -- Reset camera when respawning
    if player.Character then
        camera.CameraSubject = player.Character:FindFirstChildOfClass("Humanoid")
    end

    hideSpectateUI()
end

-- Enter spectate mode on death
ReplicatedStorage.Events.EnterSpectateMode.OnClientEvent:Connect(startSpectating)

-- Cycle targets
UserInputService.InputBegan:Connect(function(input, processed)
    if processed or not isSpectating then return end

    if input.KeyCode == Enum.KeyCode.Q then
        cycleSpectateTarget(-1)
    elseif input.KeyCode == Enum.KeyCode.E then
        cycleSpectateTarget(1)
    end
end)

-- Exit on respawn
player.CharacterAdded:Connect(stopSpectating)
```

## Objective Coordination

Multiplayer objectives require teamwork:

```lua
-- src/server/Objectives.server.luau
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local Objectives = {
    current = nil,
    completed = {},
}

local OBJECTIVE_TYPES = {
    collect = {
        setup = function(obj)
            obj.collected = 0
            obj.required = obj.data.count or 3
        end,
        check = function(obj)
            return obj.collected >= obj.required
        end,
        progress = function(obj)
            return obj.collected .. "/" .. obj.required
        end,
    },

    survive = {
        setup = function(obj)
            obj.startTime = tick()
            obj.duration = obj.data.duration or 120
        end,
        check = function(obj)
            return tick() - obj.startTime >= obj.duration
        end,
        progress = function(obj)
            local remaining = obj.duration - (tick() - obj.startTime)
            return string.format("%d:%02d", remaining / 60, remaining % 60)
        end,
    },

    activate = {
        setup = function(obj)
            obj.activated = {}
            obj.required = obj.data.targets or {}
        end,
        check = function(obj)
            for _, target in ipairs(obj.required) do
                if not obj.activated[target] then
                    return false
                end
            end
            return true
        end,
        progress = function(obj)
            local count = 0
            for _ in pairs(obj.activated) do count = count + 1 end
            return count .. "/" .. #obj.required
        end,
    },

    escape = {
        setup = function(obj)
            obj.playersEscaped = {}
            obj.escapeZone = obj.data.zone
        end,
        check = function(obj)
            -- All alive players must escape
            for _, player in ipairs(Players:GetPlayers()) do
                local data = getPlayerData(player)
                if data.isAlive and not obj.playersEscaped[player] then
                    return false
                end
            end
            return true
        end,
        progress = function(obj)
            local escaped = 0
            for _ in pairs(obj.playersEscaped) do escaped = escaped + 1 end
            local alive = 0
            for _, player in ipairs(Players:GetPlayers()) do
                if getPlayerData(player).isAlive then alive = alive + 1 end
            end
            return escaped .. "/" .. alive .. " escaped"
        end,
    },
}

function Objectives.start(objectiveId, objectiveType, data)
    local typeHandler = OBJECTIVE_TYPES[objectiveType]
    if not typeHandler then return end

    local obj = {
        id = objectiveId,
        type = objectiveType,
        data = data,
        description = data.description or "Complete the objective",
    }

    typeHandler.setup(obj)
    Objectives.current = obj

    -- Notify all players
    Objectives.sync()
end

function Objectives.update(updateType, updateData)
    local obj = Objectives.current
    if not obj then return end

    if obj.type == "collect" and updateType == "collected" then
        obj.collected = obj.collected + 1
    elseif obj.type == "activate" and updateType == "activated" then
        obj.activated[updateData.target] = true
    elseif obj.type == "escape" and updateType == "escaped" then
        obj.playersEscaped[updateData.player] = true
    end

    -- Check completion
    local typeHandler = OBJECTIVE_TYPES[obj.type]
    if typeHandler.check(obj) then
        Objectives.complete()
    else
        Objectives.sync()
    end
end

function Objectives.complete()
    local obj = Objectives.current
    if not obj then return end

    table.insert(Objectives.completed, obj.id)
    Objectives.current = nil

    for _, player in ipairs(Players:GetPlayers()) do
        ReplicatedStorage.Events.ObjectiveCompleted:FireClient(player, obj.description)
    end

    -- Trigger next objective or victory
    onObjectiveCompleted(obj.id)
end

function Objectives.sync()
    local obj = Objectives.current
    if not obj then return end

    local typeHandler = OBJECTIVE_TYPES[obj.type]

    for _, player in ipairs(Players:GetPlayers()) do
        ReplicatedStorage.Events.ObjectiveUpdated:FireClient(player, {
            description = obj.description,
            progress = typeHandler.progress(obj),
        })
    end
end

return Objectives
```

## Shared Threat Response

The creature should respond to the group:

```lua
-- src/server/CreatureMultiplayer.luau
-- Extension to creature AI for multiplayer

function CreatureAI:selectTarget()
    local players = Players:GetPlayers()
    local candidates = {}

    for _, player in ipairs(players) do
        if self:canSee(player) or self:canHear(player) then
            local distance = self:getDistanceToPlayer(player)
            local threat = self:calculateThreatLevel(player)

            table.insert(candidates, {
                player = player,
                distance = distance,
                threat = threat,
                score = threat / distance,  -- Higher score = more attractive target
            })
        end
    end

    if #candidates == 0 then
        return nil
    end

    -- Sort by score
    table.sort(candidates, function(a, b)
        return a.score > b.score
    end)

    -- Usually pick highest score, but sometimes switch targets
    if math.random() < 0.2 and #candidates > 1 then
        return candidates[2].player
    end

    return candidates[1].player
end

function CreatureAI:calculateThreatLevel(player)
    local threat = 1

    -- Flashlight on = more visible
    if playerHasFlashlightOn(player) then
        threat = threat * 1.5
    end

    -- Making noise = more attractive
    local velocity = getPlayerVelocity(player)
    if velocity > 20 then
        threat = threat * 2  -- Running
    elseif velocity > 5 then
        threat = threat * 1.3  -- Walking
    end

    -- Isolated players are easier targets
    local nearbyAllies = countNearbyPlayers(player, 20)
    if nearbyAllies == 0 then
        threat = threat * 1.5  -- Alone
    end

    -- Injured players are easier
    local health = getPlayerHealth(player)
    if health < 50 then
        threat = threat * 1.3
    end

    return threat
end

-- Split the party
function CreatureAI:trySplitGroup()
    local players = Players:GetPlayers()
    if #players < 2 then return end

    -- Find the two players furthest apart
    local maxDistance = 0
    local player1, player2

    for i, p1 in ipairs(players) do
        for j, p2 in ipairs(players) do
            if i < j then
                local dist = getDistanceBetweenPlayers(p1, p2)
                if dist > maxDistance then
                    maxDistance = dist
                    player1 = p1
                    player2 = p2
                end
            end
        end
    end

    -- If players are already somewhat separated, go for the isolated one
    if maxDistance > 30 then
        local alone1 = countNearbyPlayers(player1, 15) == 0
        local alone2 = countNearbyPlayers(player2, 15) == 0

        if alone1 then
            self.target = player1
        elseif alone2 then
            self.target = player2
        end
    end
end
```

## Vibe Coding Multiplayer

When building multiplayer systems with AI:

> "Create a proximity chat system where messages only reach players within 50 studs"

> "Build a player revival system with 5-second revive time and 60-second bleedout"

> "Implement item trading between players within 10 studs of each other"

> "Add spectator mode for dead players to watch living teammates"

The AI handles the networking boilerplate—RemoteEvents, data sync, edge cases. You focus on the social dynamics.

## Playtesting Multiplayer

Multiplayer horror requires specific testing:

1. **Solo test** - Does it work with one player?
2. **Duo test** - The most common multiplayer scenario
3. **Full lobby** - Does it scale? Is it still scary?
4. **Asymmetric test** - One good player, one new player
5. **Grief test** - Can players ruin each other's experience?

## Next Steps

With multiplayer working, we have a complete horror game. But "complete" isn't "polished." In the final chapter, we'll cover the finishing touches—UI polish, sound design refinement, performance optimization, and publishing your game to the Roblox platform.
