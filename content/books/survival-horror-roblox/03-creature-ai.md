# Creature AI and Threats

A horror game without threats is just a walking simulator with mood lighting. The creature—whatever form it takes—must feel intelligent, relentless, and terrifying.

This chapter covers the AI systems that make players genuinely afraid.

## The Core Loop

Every creature AI follows a basic loop:

1. **Perceive** - Detect players through sight, sound, or other senses
2. **Decide** - Choose a behavior based on current state
3. **Act** - Execute movement, attacks, or other actions
4. **Update** - Adjust state based on results

```lua
-- src/server/Creature.server.luau
local PathfindingService = game:GetService("PathfindingService")
local Players = game:GetService("Players")

local CreatureAI = {}
CreatureAI.__index = CreatureAI

function CreatureAI.new(model)
    local self = setmetatable({}, CreatureAI)

    self.model = model
    self.humanoid = model:FindFirstChildOfClass("Humanoid")
    self.rootPart = model:FindFirstChild("HumanoidRootPart")

    self.state = "idle"
    self.target = nil
    self.lastKnownPosition = nil
    self.alertLevel = 0  -- 0 = unaware, 1 = suspicious, 2 = hunting

    self.config = {
        detectionRadius = 50,
        chaseSpeed = 18,
        patrolSpeed = 8,
        attackRange = 5,
        loseTargetTime = 10,
    }

    return self
end

function CreatureAI:update(dt)
    self:perceive()
    self:decide()
    self:act(dt)
end

return CreatureAI
```

## Detection Systems

Players should be detectable through multiple senses. This creates interesting gameplay—they can hide from sight but still be heard.

### Line of Sight

```lua
function CreatureAI:canSee(target)
    local targetRoot = target.Character and target.Character:FindFirstChild("HumanoidRootPart")
    if not targetRoot then return false end

    local origin = self.rootPart.Position + Vector3.new(0, 2, 0)  -- Eye height
    local direction = (targetRoot.Position - origin)
    local distance = direction.Magnitude

    -- Too far?
    if distance > self.config.detectionRadius then
        return false
    end

    -- Raycast for obstacles
    local rayParams = RaycastParams.new()
    rayParams.FilterDescendantsInstances = {self.model}
    rayParams.FilterType = Enum.RaycastFilterType.Exclude

    local result = workspace:Raycast(origin, direction, rayParams)

    if result then
        -- Hit something - is it the target?
        local hitPart = result.Instance
        return hitPart:IsDescendantOf(target.Character)
    end

    return true  -- Nothing in the way
end
```

### Sound Detection

Players making noise should attract attention:

```lua
function CreatureAI:canHear(target)
    local targetRoot = target.Character and target.Character:FindFirstChild("HumanoidRootPart")
    if not targetRoot then return false end

    local distance = (targetRoot.Position - self.rootPart.Position).Magnitude
    local humanoid = target.Character:FindFirstChildOfClass("Humanoid")

    if not humanoid then return false end

    -- Calculate noise level based on movement
    local noiseLevel = 0
    local velocity = targetRoot.AssemblyLinearVelocity.Magnitude

    if velocity > 20 then
        noiseLevel = 3  -- Running
    elseif velocity > 5 then
        noiseLevel = 1  -- Walking
    else
        noiseLevel = 0  -- Standing still
    end

    -- Noise travels further in quiet environments
    local hearingRange = noiseLevel * 30

    return distance <= hearingRange
end
```

### Combined Perception

```lua
function CreatureAI:perceive()
    local closestTarget = nil
    local closestDistance = math.huge

    for _, player in ipairs(Players:GetPlayers()) do
        if self:canSee(player) or self:canHear(player) then
            local distance = self:getDistanceToPlayer(player)
            if distance < closestDistance then
                closestTarget = player
                closestDistance = distance
            end
        end
    end

    if closestTarget then
        self.target = closestTarget
        self.lastKnownPosition = closestTarget.Character.HumanoidRootPart.Position
        self.alertLevel = 2
        self.lastSeenTime = tick()
    elseif self.target and (tick() - self.lastSeenTime) > self.config.loseTargetTime then
        -- Lost target for too long
        self.target = nil
        self.alertLevel = 1  -- Still suspicious
    end
end
```

## Behavior States

Use a state machine to organize creature behaviors:

```lua
local STATES = {
    idle = "idle",
    patrol = "patrol",
    investigate = "investigate",
    chase = "chase",
    attack = "attack",
    search = "search",
}

function CreatureAI:decide()
    if self.alertLevel == 0 then
        self.state = STATES.patrol
    elseif self.alertLevel == 1 then
        self.state = STATES.investigate
    elseif self.alertLevel == 2 then
        if self:getDistanceToTarget() < self.config.attackRange then
            self.state = STATES.attack
        else
            self.state = STATES.chase
        end
    end
end

function CreatureAI:act(dt)
    if self.state == STATES.idle then
        self:doIdle()
    elseif self.state == STATES.patrol then
        self:doPatrol()
    elseif self.state == STATES.investigate then
        self:doInvestigate()
    elseif self.state == STATES.chase then
        self:doChase()
    elseif self.state == STATES.attack then
        self:doAttack()
    elseif self.state == STATES.search then
        self:doSearch()
    end
end
```

## Pathfinding

Roblox provides PathfindingService for navigation:

```lua
function CreatureAI:moveToPosition(targetPosition)
    local path = PathfindingService:CreatePath({
        AgentRadius = 2,
        AgentHeight = 5,
        AgentCanJump = true,
        AgentCanClimb = false,
    })

    local success, errorMessage = pcall(function()
        path:ComputeAsync(self.rootPart.Position, targetPosition)
    end)

    if success and path.Status == Enum.PathStatus.Success then
        local waypoints = path:GetWaypoints()

        for _, waypoint in ipairs(waypoints) do
            self.humanoid:MoveTo(waypoint.Position)
            self.humanoid.MoveToFinished:Wait()

            -- Check if we should stop (target moved, etc.)
            if self:shouldAbortPath() then
                break
            end
        end
    else
        -- Pathfinding failed - move directly (may get stuck)
        self.humanoid:MoveTo(targetPosition)
    end
end

function CreatureAI:doChase()
    if not self.target then return end

    local targetPosition = self.target.Character and
        self.target.Character:FindFirstChild("HumanoidRootPart") and
        self.target.Character.HumanoidRootPart.Position

    if targetPosition then
        self.humanoid.WalkSpeed = self.config.chaseSpeed
        self:moveToPosition(targetPosition)
    end
end
```

## Patrol Behavior

When not hunting, creatures should patrol to seem alive:

```lua
function CreatureAI:setupPatrolPoints(points)
    self.patrolPoints = points
    self.currentPatrolIndex = 1
end

function CreatureAI:doPatrol()
    if not self.patrolPoints or #self.patrolPoints == 0 then
        self:doIdle()
        return
    end

    self.humanoid.WalkSpeed = self.config.patrolSpeed
    local targetPoint = self.patrolPoints[self.currentPatrolIndex]

    self:moveToPosition(targetPoint)

    -- Check if we reached the point
    local distance = (self.rootPart.Position - targetPoint).Magnitude
    if distance < 3 then
        -- Wait at patrol point
        task.wait(2 + math.random() * 3)

        -- Move to next point
        self.currentPatrolIndex = (self.currentPatrolIndex % #self.patrolPoints) + 1
    end
end
```

## Investigation Behavior

When suspicious but not certain, creatures should investigate:

```lua
function CreatureAI:doInvestigate()
    if not self.lastKnownPosition then
        self.alertLevel = 0
        return
    end

    self.humanoid.WalkSpeed = self.config.patrolSpeed * 1.2

    self:moveToPosition(self.lastKnownPosition)

    local distance = (self.rootPart.Position - self.lastKnownPosition).Magnitude
    if distance < 5 then
        -- Reached investigation point, look around
        self:lookAround()

        -- If nothing found, decrease alert level
        if not self.target then
            self.alertLevel = 0
            self.lastKnownPosition = nil
        end
    end
end

function CreatureAI:lookAround()
    -- Turn in place to scan area
    for i = 1, 4 do
        self.rootPart.CFrame = self.rootPart.CFrame * CFrame.Angles(0, math.rad(90), 0)
        task.wait(1)

        -- Check for players during each turn
        self:perceive()
        if self.alertLevel == 2 then
            return  -- Found someone!
        end
    end
end
```

## Making It Scary

Technical AI is necessary but not sufficient. The creature must *feel* dangerous:

### Telegraphing Presence

Let players know danger is near before they see it:

```lua
function CreatureAI:emitPresence()
    -- Play ambient sounds when creature is nearby
    local nearbyPlayers = self:getPlayersInRadius(100)

    for _, player in ipairs(nearbyPlayers) do
        local distance = self:getDistanceToPlayer(player)
        local intensity = 1 - (distance / 100)

        -- Fire client event to play sounds/effects
        game.ReplicatedStorage.Events.CreatureNearby:FireClient(player, intensity)
    end
end
```

### Unpredictability

Don't be perfectly optimal—that's boring:

```lua
function CreatureAI:doChase()
    if not self.target then return end

    -- Occasionally lose track
    if math.random() < 0.1 then
        self.alertLevel = 1
        task.wait(2 + math.random() * 3)
        return
    end

    -- Sometimes take suboptimal routes
    local targetPosition = self.lastKnownPosition
    if math.random() < 0.3 then
        -- Add randomness to target
        targetPosition = targetPosition + Vector3.new(
            (math.random() - 0.5) * 20,
            0,
            (math.random() - 0.5) * 20
        )
    end

    self.humanoid.WalkSpeed = self.config.chaseSpeed
    self:moveToPosition(targetPosition)
end
```

### The Peek

One of horror's most effective tools—let players see the creature watching them:

```lua
function CreatureAI:tryPeek(targetPlayer)
    -- Find a corner or doorway near the player
    local peekSpots = self:findPeekSpots(targetPlayer)

    if #peekSpots > 0 then
        local spot = peekSpots[math.random(#peekSpots)]
        self:moveToPosition(spot)
        self:lookAt(targetPlayer.Character.HumanoidRootPart.Position)

        -- Stand there ominously
        task.wait(3 + math.random() * 5)

        -- Then disappear
        self:moveToPosition(self:findHidingSpot())
    end
end
```

## Vibe Coding Creature AI

When working with AI on creature behavior:

> "Create a creature that patrols between waypoints but investigates loud sounds within 50 studs"

> "Add a behavior where the creature sometimes stops and listens, scanning the area"

> "Make the chase feel tense—the creature should be fast but occasionally lose the player"

Let AI handle the boilerplate (pathfinding setup, state machine structure) while you focus on the behaviors that make your creature unique.

## Balancing Challenge

Horror requires helplessness, but not hopelessness:

- **The creature should catch you sometimes** - Near misses lose tension if they always work
- **Give tells before attacks** - Sound cues, visual warnings
- **Provide escape options** - Hiding spots, diversions, sprint
- **Vary the threat** - Sometimes the creature is close, sometimes it's background dread

## Next Steps

We have atmosphere and a threat. Now players need ways to survive. In the next chapter, we'll build the resource management and survival mechanics that give players agency in our horror world.
