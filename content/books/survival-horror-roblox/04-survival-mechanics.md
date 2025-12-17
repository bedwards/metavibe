# Survival Mechanics

Horror without stakes is just spooky aesthetics. Survival mechanics create the stakes—every resource matters, every decision has consequences, every mistake brings you closer to death.

This chapter covers the systems that make survival feel meaningful.

## Health System

Health in survival horror should feel fragile. Players need to constantly manage their status:

```lua
-- src/shared/PlayerStats.luau
local PlayerStats = {}
PlayerStats.__index = PlayerStats

function PlayerStats.new()
    local self = setmetatable({}, PlayerStats)

    self.health = 100
    self.maxHealth = 100
    self.stamina = 100
    self.maxStamina = 100
    self.sanity = 100  -- Optional: mental health mechanic

    self.effects = {}  -- Active status effects

    return self
end

function PlayerStats:takeDamage(amount, damageType)
    -- Different damage types can have different effects
    local finalDamage = amount

    if damageType == "bleed" then
        -- Bleeding does damage over time
        self:applyEffect("bleeding", {
            duration = 30,
            damagePerSecond = 2,
        })
        finalDamage = amount * 0.5  -- Initial hit is smaller
    elseif damageType == "poison" then
        self:applyEffect("poisoned", {
            duration = 60,
            damagePerSecond = 1,
            staminaPenalty = 0.5,
        })
    end

    self.health = math.max(0, self.health - finalDamage)
    return self.health <= 0  -- Returns true if dead
end

function PlayerStats:heal(amount)
    self.health = math.min(self.maxHealth, self.health + amount)
end

function PlayerStats:applyEffect(effectName, data)
    self.effects[effectName] = {
        startTime = tick(),
        data = data,
    }
end

function PlayerStats:update(dt)
    -- Process active effects
    for name, effect in pairs(self.effects) do
        local elapsed = tick() - effect.startTime

        if elapsed >= effect.data.duration then
            -- Effect expired
            self.effects[name] = nil
        else
            -- Apply effect
            if effect.data.damagePerSecond then
                self.health = math.max(0, self.health - effect.data.damagePerSecond * dt)
            end
        end
    end
end

return PlayerStats
```

### Displaying Health

Health UI should be minimal but clear:

```lua
-- src/client/HealthUI.client.luau
local Players = game:GetService("Players")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Create health bar
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "HealthUI"
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

local healthFrame = Instance.new("Frame")
healthFrame.Name = "HealthFrame"
healthFrame.Size = UDim2.new(0, 200, 0, 20)
healthFrame.Position = UDim2.new(0, 20, 1, -40)
healthFrame.BackgroundColor3 = Color3.fromRGB(40, 40, 40)
healthFrame.BorderSizePixel = 0
healthFrame.Parent = screenGui

local healthBar = Instance.new("Frame")
healthBar.Name = "HealthBar"
healthBar.Size = UDim2.new(1, 0, 1, 0)
healthBar.BackgroundColor3 = Color3.fromRGB(180, 40, 40)
healthBar.BorderSizePixel = 0
healthBar.Parent = healthFrame

local healthLabel = Instance.new("TextLabel")
healthLabel.Name = "HealthLabel"
healthLabel.Size = UDim2.new(1, 0, 1, 0)
healthLabel.BackgroundTransparency = 1
healthLabel.TextColor3 = Color3.new(1, 1, 1)
healthLabel.TextSize = 14
healthLabel.Font = Enum.Font.SourceSansBold
healthLabel.Parent = healthFrame

-- Low health effects
local lowHealthOverlay = Instance.new("Frame")
lowHealthOverlay.Name = "LowHealthOverlay"
lowHealthOverlay.Size = UDim2.new(1, 0, 1, 0)
lowHealthOverlay.BackgroundColor3 = Color3.fromRGB(100, 0, 0)
lowHealthOverlay.BackgroundTransparency = 1
lowHealthOverlay.BorderSizePixel = 0
lowHealthOverlay.ZIndex = 0
lowHealthOverlay.Parent = screenGui

local function updateHealthDisplay(health, maxHealth)
    local percent = health / maxHealth

    -- Animate health bar
    local tween = TweenService:Create(healthBar, TweenInfo.new(0.3), {
        Size = UDim2.new(percent, 0, 1, 0)
    })
    tween:Play()

    healthLabel.Text = math.floor(health) .. " / " .. maxHealth

    -- Low health warning effect
    if percent < 0.25 then
        -- Pulse red overlay
        local pulse = TweenService:Create(lowHealthOverlay, TweenInfo.new(0.5, Enum.EasingStyle.Sine, Enum.EasingDirection.InOut, -1, true), {
            BackgroundTransparency = 0.7
        })
        pulse:Play()
    else
        lowHealthOverlay.BackgroundTransparency = 1
    end
end

-- Connect to health changes
game.ReplicatedStorage.Events.HealthChanged.OnClientEvent:Connect(updateHealthDisplay)
```

## Stamina System

Stamina limits what players can do. Running, attacking, and certain actions drain stamina:

```lua
-- src/shared/StaminaSystem.luau
local Config = require(game.ReplicatedStorage.Shared.Config)

local StaminaSystem = {}
StaminaSystem.__index = StaminaSystem

function StaminaSystem.new(stats)
    local self = setmetatable({}, StaminaSystem)

    self.stats = stats
    self.isExhausted = false  -- Can't run when exhausted
    self.exhaustionThreshold = 10  -- Can't run below this
    self.recoveryThreshold = 30  -- Must recover to this before running again

    return self
end

function StaminaSystem:canRun()
    if self.isExhausted then
        return self.stats.stamina >= self.recoveryThreshold
    end
    return self.stats.stamina > self.exhaustionThreshold
end

function StaminaSystem:startRunning()
    if not self:canRun() then return false end
    self.isExhausted = false
    return true
end

function StaminaSystem:update(dt, isRunning, humanoid)
    if isRunning and self:canRun() then
        -- Drain stamina while running
        self.stats.stamina = math.max(0, self.stats.stamina - Config.STAMINA_DRAIN_RATE * dt)
        humanoid.WalkSpeed = Config.PLAYER_RUN_SPEED

        if self.stats.stamina <= self.exhaustionThreshold then
            self.isExhausted = true
        end
    else
        -- Regenerate stamina
        local regenRate = Config.STAMINA_REGEN_RATE

        -- Standing still regenerates faster
        if humanoid.MoveDirection.Magnitude < 0.1 then
            regenRate = regenRate * 2
        end

        self.stats.stamina = math.min(self.stats.maxStamina, self.stats.stamina + regenRate * dt)
        humanoid.WalkSpeed = Config.PLAYER_WALK_SPEED

        -- Clear exhaustion when recovered
        if self.isExhausted and self.stats.stamina >= self.recoveryThreshold then
            self.isExhausted = false
        end
    end
end

return StaminaSystem
```

## Inventory System

A proper inventory creates meaningful choices about what to carry:

```lua
-- src/shared/Inventory.luau
local Inventory = {}
Inventory.__index = Inventory

local ITEM_DEFINITIONS = {
    flashlight = {
        name = "Flashlight",
        maxStack = 1,
        weight = 1,
        category = "tool",
    },
    battery = {
        name = "Battery",
        maxStack = 5,
        weight = 0.2,
        category = "consumable",
    },
    medkit = {
        name = "Medical Kit",
        maxStack = 3,
        weight = 2,
        category = "consumable",
        healAmount = 50,
    },
    bandage = {
        name = "Bandage",
        maxStack = 10,
        weight = 0.5,
        category = "consumable",
        healAmount = 15,
        curesEffect = "bleeding",
    },
    key_red = {
        name = "Red Keycard",
        maxStack = 1,
        weight = 0.1,
        category = "key",
    },
}

function Inventory.new(maxSlots, maxWeight)
    local self = setmetatable({}, Inventory)

    self.slots = {}
    self.maxSlots = maxSlots or 10
    self.maxWeight = maxWeight or 20
    self.currentWeight = 0

    return self
end

function Inventory:getCurrentWeight()
    local weight = 0
    for _, slot in pairs(self.slots) do
        local def = ITEM_DEFINITIONS[slot.itemId]
        if def then
            weight = weight + (def.weight * slot.quantity)
        end
    end
    return weight
end

function Inventory:canAddItem(itemId, quantity)
    local def = ITEM_DEFINITIONS[itemId]
    if not def then return false, "Unknown item" end

    quantity = quantity or 1
    local addedWeight = def.weight * quantity

    if self:getCurrentWeight() + addedWeight > self.maxWeight then
        return false, "Too heavy"
    end

    -- Check if we can stack with existing
    for slotIndex, slot in pairs(self.slots) do
        if slot.itemId == itemId then
            if slot.quantity + quantity <= def.maxStack then
                return true, slotIndex  -- Can stack
            end
        end
    end

    -- Need new slot
    if self:getUsedSlots() >= self.maxSlots then
        return false, "Inventory full"
    end

    return true, nil  -- Can add to new slot
end

function Inventory:addItem(itemId, quantity)
    local canAdd, result = self:canAddItem(itemId, quantity)
    if not canAdd then return false, result end

    quantity = quantity or 1
    local def = ITEM_DEFINITIONS[itemId]

    -- Try to stack first
    if type(result) == "number" then
        self.slots[result].quantity = self.slots[result].quantity + quantity
        return true
    end

    -- Add to new slot
    local newIndex = self:getFirstEmptySlot()
    self.slots[newIndex] = {
        itemId = itemId,
        quantity = quantity,
    }

    return true
end

function Inventory:removeItem(itemId, quantity)
    quantity = quantity or 1

    for slotIndex, slot in pairs(self.slots) do
        if slot.itemId == itemId then
            if slot.quantity >= quantity then
                slot.quantity = slot.quantity - quantity
                if slot.quantity <= 0 then
                    self.slots[slotIndex] = nil
                end
                return true
            end
        end
    end

    return false
end

function Inventory:hasItem(itemId, quantity)
    quantity = quantity or 1
    local total = 0

    for _, slot in pairs(self.slots) do
        if slot.itemId == itemId then
            total = total + slot.quantity
        end
    end

    return total >= quantity
end

function Inventory:getUsedSlots()
    local count = 0
    for _ in pairs(self.slots) do
        count = count + 1
    end
    return count
end

function Inventory:getFirstEmptySlot()
    for i = 1, self.maxSlots do
        if not self.slots[i] then
            return i
        end
    end
    return nil
end

function Inventory.getItemDefinition(itemId)
    return ITEM_DEFINITIONS[itemId]
end

return Inventory
```

### Inventory UI

```lua
-- src/client/InventoryUI.client.luau
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Inventory = require(ReplicatedStorage.Shared.Inventory)

local player = Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

local isOpen = false
local inventoryData = {}

-- Create inventory screen
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "InventoryUI"
screenGui.Enabled = false
screenGui.ResetOnSpawn = false
screenGui.Parent = playerGui

local background = Instance.new("Frame")
background.Name = "Background"
background.Size = UDim2.new(0, 400, 0, 500)
background.Position = UDim2.new(0.5, -200, 0.5, -250)
background.BackgroundColor3 = Color3.fromRGB(30, 30, 35)
background.BorderSizePixel = 0
background.Parent = screenGui

local title = Instance.new("TextLabel")
title.Name = "Title"
title.Size = UDim2.new(1, 0, 0, 40)
title.BackgroundColor3 = Color3.fromRGB(20, 20, 25)
title.BorderSizePixel = 0
title.Text = "INVENTORY"
title.TextColor3 = Color3.new(1, 1, 1)
title.TextSize = 18
title.Font = Enum.Font.SourceSansBold
title.Parent = background

local gridContainer = Instance.new("Frame")
gridContainer.Name = "Grid"
gridContainer.Size = UDim2.new(1, -20, 1, -100)
gridContainer.Position = UDim2.new(0, 10, 0, 50)
gridContainer.BackgroundTransparency = 1
gridContainer.Parent = background

local gridLayout = Instance.new("UIGridLayout")
gridLayout.CellSize = UDim2.new(0, 70, 0, 70)
gridLayout.CellPadding = UDim2.new(0, 5, 0, 5)
gridLayout.Parent = gridContainer

-- Weight display
local weightLabel = Instance.new("TextLabel")
weightLabel.Name = "WeightLabel"
weightLabel.Size = UDim2.new(1, 0, 0, 30)
weightLabel.Position = UDim2.new(0, 0, 1, -40)
weightLabel.BackgroundTransparency = 1
weightLabel.TextColor3 = Color3.fromRGB(150, 150, 150)
weightLabel.TextSize = 14
weightLabel.Font = Enum.Font.SourceSans
weightLabel.Parent = background

local function createSlot(index)
    local slot = Instance.new("Frame")
    slot.Name = "Slot_" .. index
    slot.BackgroundColor3 = Color3.fromRGB(50, 50, 55)
    slot.BorderSizePixel = 0
    slot.Parent = gridContainer

    local icon = Instance.new("ImageLabel")
    icon.Name = "Icon"
    icon.Size = UDim2.new(0.8, 0, 0.8, 0)
    icon.Position = UDim2.new(0.1, 0, 0.05, 0)
    icon.BackgroundTransparency = 1
    icon.ScaleType = Enum.ScaleType.Fit
    icon.Parent = slot

    local quantity = Instance.new("TextLabel")
    quantity.Name = "Quantity"
    quantity.Size = UDim2.new(0.4, 0, 0.3, 0)
    quantity.Position = UDim2.new(0.55, 0, 0.65, 0)
    quantity.BackgroundTransparency = 1
    quantity.TextColor3 = Color3.new(1, 1, 1)
    quantity.TextSize = 12
    quantity.Font = Enum.Font.SourceSansBold
    quantity.TextXAlignment = Enum.TextXAlignment.Right
    quantity.Parent = slot

    return slot
end

local function refreshInventory()
    -- Clear existing slots
    for _, child in ipairs(gridContainer:GetChildren()) do
        if child:IsA("Frame") then
            child:Destroy()
        end
    end

    -- Create slots
    for i = 1, 10 do
        local slot = createSlot(i)
        local slotData = inventoryData[i]

        if slotData then
            local def = Inventory.getItemDefinition(slotData.itemId)
            if def then
                slot.Icon.Image = "rbxassetid://YOUR_ITEM_ICONS"  -- Replace with actual icons
                slot.Quantity.Text = slotData.quantity > 1 and tostring(slotData.quantity) or ""
            end
        else
            slot.Icon.Image = ""
            slot.Quantity.Text = ""
        end
    end
end

local function toggleInventory()
    isOpen = not isOpen
    screenGui.Enabled = isOpen

    if isOpen then
        -- Request inventory data from server
        ReplicatedStorage.Events.RequestInventory:FireServer()
    end
end

-- Keyboard toggle
UserInputService.InputBegan:Connect(function(input, processed)
    if processed then return end

    if input.KeyCode == Enum.KeyCode.Tab or input.KeyCode == Enum.KeyCode.I then
        toggleInventory()
    end
end)

-- Receive inventory updates
ReplicatedStorage.Events.InventoryUpdated.OnClientEvent:Connect(function(data, currentWeight, maxWeight)
    inventoryData = data
    weightLabel.Text = string.format("Weight: %.1f / %.1f", currentWeight, maxWeight)
    refreshInventory()
end)
```

## Item Pickups

Items in the world that players can collect:

```lua
-- src/server/ItemPickup.server.luau
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local CollectionService = game:GetService("CollectionService")

local Inventory = require(ReplicatedStorage.Shared.Inventory)

-- Tag items in the world with "Pickup"
local PICKUP_RANGE = 5

local function setupPickup(part)
    -- Get item data from attributes
    local itemId = part:GetAttribute("ItemId")
    local quantity = part:GetAttribute("Quantity") or 1

    if not itemId then
        warn("Pickup missing ItemId attribute: " .. part:GetFullName())
        return
    end

    -- Create proximity prompt
    local prompt = Instance.new("ProximityPrompt")
    prompt.ActionText = "Pick up"
    prompt.ObjectText = Inventory.getItemDefinition(itemId).name
    prompt.MaxActivationDistance = PICKUP_RANGE
    prompt.HoldDuration = 0.3
    prompt.Parent = part

    prompt.Triggered:Connect(function(player)
        local playerInventory = getPlayerInventory(player)  -- Your player data system

        local success, err = playerInventory:addItem(itemId, quantity)

        if success then
            -- Remove pickup from world
            part:Destroy()

            -- Notify player
            ReplicatedStorage.Events.ItemPickedUp:FireClient(player, itemId, quantity)

            -- Sync inventory
            syncInventoryToClient(player)
        else
            -- Notify player of failure
            ReplicatedStorage.Events.PickupFailed:FireClient(player, err)
        end
    end)
end

-- Set up existing pickups
for _, pickup in ipairs(CollectionService:GetTagged("Pickup")) do
    setupPickup(pickup)
end

-- Set up future pickups
CollectionService:GetInstanceAddedSignal("Pickup"):Connect(setupPickup)
```

## Crafting System

Let players combine items to create new ones:

```lua
-- src/shared/Crafting.luau
local Crafting = {}

local RECIPES = {
    {
        id = "torch",
        name = "Makeshift Torch",
        ingredients = {
            { itemId = "stick", quantity = 1 },
            { itemId = "cloth", quantity = 1 },
        },
        result = { itemId = "torch", quantity = 1 },
        craftTime = 3,
    },
    {
        id = "medkit",
        name = "Medical Kit",
        ingredients = {
            { itemId = "bandage", quantity = 3 },
            { itemId = "alcohol", quantity = 1 },
        },
        result = { itemId = "medkit", quantity = 1 },
        craftTime = 5,
    },
    {
        id = "lockpick",
        name = "Lockpick",
        ingredients = {
            { itemId = "wire", quantity = 2 },
        },
        result = { itemId = "lockpick", quantity = 1 },
        craftTime = 4,
    },
}

function Crafting.getAvailableRecipes(inventory)
    local available = {}

    for _, recipe in ipairs(RECIPES) do
        if Crafting.canCraft(inventory, recipe.id) then
            table.insert(available, recipe)
        end
    end

    return available
end

function Crafting.canCraft(inventory, recipeId)
    local recipe = Crafting.getRecipe(recipeId)
    if not recipe then return false end

    for _, ingredient in ipairs(recipe.ingredients) do
        if not inventory:hasItem(ingredient.itemId, ingredient.quantity) then
            return false
        end
    end

    -- Check if result can fit
    local canAdd = inventory:canAddItem(recipe.result.itemId, recipe.result.quantity)
    return canAdd
end

function Crafting.craft(inventory, recipeId)
    if not Crafting.canCraft(inventory, recipeId) then
        return false, "Cannot craft"
    end

    local recipe = Crafting.getRecipe(recipeId)

    -- Remove ingredients
    for _, ingredient in ipairs(recipe.ingredients) do
        inventory:removeItem(ingredient.itemId, ingredient.quantity)
    end

    -- Add result
    inventory:addItem(recipe.result.itemId, recipe.result.quantity)

    return true, recipe.craftTime
end

function Crafting.getRecipe(recipeId)
    for _, recipe in ipairs(RECIPES) do
        if recipe.id == recipeId then
            return recipe
        end
    end
    return nil
end

function Crafting.getAllRecipes()
    return RECIPES
end

return Crafting
```

## Flashlight and Battery Management

A classic horror mechanic—limited light:

```lua
-- src/client/Flashlight.client.luau
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local TweenService = game:GetService("TweenService")

local player = Players.LocalPlayer
local character = player.Character or player.CharacterAdded:Wait()

local flashlightOn = false
local batteryLevel = 100
local drainRate = 5  -- Percent per second

local spotlight = nil
local flickerConnection = nil

local function createSpotlight()
    local head = character:WaitForChild("Head")

    spotlight = Instance.new("SpotLight")
    spotlight.Name = "Flashlight"
    spotlight.Brightness = 3
    spotlight.Range = 60
    spotlight.Angle = 45
    spotlight.Face = Enum.NormalId.Front
    spotlight.Enabled = false
    spotlight.Parent = head

    return spotlight
end

local function updateFlashlightState()
    if not spotlight then return end

    spotlight.Enabled = flashlightOn and batteryLevel > 0

    -- Flicker when battery is low
    if batteryLevel < 20 and flashlightOn then
        if not flickerConnection then
            flickerConnection = task.spawn(function()
                while flashlightOn and batteryLevel > 0 and batteryLevel < 20 do
                    local intensity = 0.5 + math.random() * 0.5
                    spotlight.Brightness = 3 * intensity
                    task.wait(0.1 + math.random() * 0.2)
                end
                spotlight.Brightness = 3
            end)
        end
    else
        if flickerConnection then
            task.cancel(flickerConnection)
            flickerConnection = nil
            spotlight.Brightness = 3
        end
    end
end

local function toggleFlashlight()
    -- Check if player has flashlight item
    -- (simplified - your inventory system handles this)

    flashlightOn = not flashlightOn
    updateFlashlightState()

    -- Play sound
    local sound = Instance.new("Sound")
    sound.SoundId = "rbxassetid://YOUR_CLICK_SOUND"
    sound.Volume = 0.5
    sound.Parent = character.Head
    sound:Play()
    sound.Ended:Connect(function() sound:Destroy() end)
end

local function useBattery()
    if batteryLevel <= 0 then
        flashlightOn = false
        updateFlashlightState()
        return
    end

    -- Check for batteries in inventory
    ReplicatedStorage.Events.UseBattery:FireServer()
end

-- Initialize
createSpotlight()

-- Toggle with F key
UserInputService.InputBegan:Connect(function(input, processed)
    if processed then return end

    if input.KeyCode == Enum.KeyCode.F then
        toggleFlashlight()
    elseif input.KeyCode == Enum.KeyCode.R and flashlightOn then
        useBattery()
    end
end)

-- Battery drain loop
task.spawn(function()
    while true do
        if flashlightOn and batteryLevel > 0 then
            batteryLevel = math.max(0, batteryLevel - drainRate * 0.1)
            updateFlashlightState()

            -- Update UI
            ReplicatedStorage.Events.BatteryChanged:Fire(batteryLevel)
        end
        task.wait(0.1)
    end
end)

-- Receive battery level from server
ReplicatedStorage.Events.BatteryUpdated.OnClientEvent:Connect(function(level)
    batteryLevel = level
    updateFlashlightState()
end)

-- Respawn handling
player.CharacterAdded:Connect(function(newCharacter)
    character = newCharacter
    createSpotlight()
    flashlightOn = false
    updateFlashlightState()
end)
```

## Hunger and Thirst (Optional)

For longer-form survival horror:

```lua
-- src/server/Needs.server.luau
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Players = game:GetService("Players")

local HUNGER_DRAIN_RATE = 0.5  -- Per minute
local THIRST_DRAIN_RATE = 0.8  -- Per minute
local STARVATION_DAMAGE = 1    -- Damage per second when starving

local playerNeeds = {}

local function initPlayer(player)
    playerNeeds[player] = {
        hunger = 100,
        thirst = 100,
    }
end

local function updateNeeds(player, dt)
    local needs = playerNeeds[player]
    if not needs then return end

    -- Drain needs
    needs.hunger = math.max(0, needs.hunger - HUNGER_DRAIN_RATE * dt / 60)
    needs.thirst = math.max(0, needs.thirst - THIRST_DRAIN_RATE * dt / 60)

    -- Apply starvation/dehydration damage
    local character = player.Character
    local humanoid = character and character:FindFirstChildOfClass("Humanoid")

    if humanoid then
        if needs.hunger <= 0 then
            humanoid:TakeDamage(STARVATION_DAMAGE * dt)
        end
        if needs.thirst <= 0 then
            humanoid:TakeDamage(STARVATION_DAMAGE * dt)
        end
    end

    -- Sync to client
    ReplicatedStorage.Events.NeedsUpdated:FireClient(player, needs.hunger, needs.thirst)
end

local function consumeFood(player, hungerRestore)
    local needs = playerNeeds[player]
    if not needs then return end

    needs.hunger = math.min(100, needs.hunger + hungerRestore)
end

local function consumeWater(player, thirstRestore)
    local needs = playerNeeds[player]
    if not needs then return end

    needs.thirst = math.min(100, needs.thirst + thirstRestore)
end

-- Initialize players
Players.PlayerAdded:Connect(initPlayer)
Players.PlayerRemoving:Connect(function(player)
    playerNeeds[player] = nil
end)

-- Update loop
task.spawn(function()
    while true do
        local dt = task.wait(1)
        for player in pairs(playerNeeds) do
            updateNeeds(player, dt)
        end
    end
end)

-- Expose functions
return {
    consumeFood = consumeFood,
    consumeWater = consumeWater,
}
```

## Vibe Coding Survival Mechanics

When building these systems with AI:

> "Create an inventory system with weight limits and stackable items"

> "Add a stamina system where players get exhausted if they run too long"

> "Implement a flashlight that drains batteries and flickers when low"

> "Build a simple crafting system with 3-4 recipes for survival items"

Let AI handle the boilerplate—state management, UI updates, server sync. You focus on the tuning: How fast does stamina drain? How long do batteries last? These numbers define the *feel*.

## Balancing Survival

Survival mechanics require careful tuning:

- **Too punishing** - Players feel helpless, give up
- **Too forgiving** - No tension, resources don't matter
- **The sweet spot** - Players are always slightly worried but never hopeless

Start generous, then tighten. It's easier to make a game harder than to add features that make it easier.

## Next Steps

With survival mechanics in place, players have tools to stay alive. But where do they survive? In the next chapter, we'll build the environments that make those tools necessary—the dark corridors, abandoned rooms, and terrifying spaces of our horror world.
