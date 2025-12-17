# Project Setup with Rojo

Before we write any game code, we need a professional development setup. Roblox Studio is great for building, but for serious games you need version control, team collaboration, and a workflow that doesn't involve clicking through menus.

That's where Rojo comes in.

## What is Rojo?

Rojo is a project management tool that syncs files on your computer with Roblox Studio. Instead of editing scripts inside Studio, you edit `.luau` files in VS Code (or any editor) and Rojo keeps them in sync.

Why does this matter?

- **Git version control** - Track every change, branch for features, review code in PRs
- **Real editor** - Use VS Code with proper Lua extensions, not Studio's limited editor
- **Team collaboration** - Multiple people can work on the same project
- **AI assistance** - Claude Code and Cursor work with files, not Studio

## Installing Rojo

### Option 1: Cargo (Recommended)

If you have Rust installed:

```bash
cargo install rojo
```

### Option 2: VS Code Extension

Install the "Rojo" extension from the VS Code marketplace. It includes the Rojo binary.

### Option 3: GitHub Releases

Download the binary from [rojo.space](https://rojo.space) and add it to your PATH.

Verify installation:

```bash
rojo --version
```

## Project Structure

A well-organized Roblox project looks like this:

```
my-horror-game/
├── src/
│   ├── client/           # StarterPlayerScripts
│   ├── server/           # ServerScriptService
│   └── shared/           # ReplicatedStorage
├── assets/               # Models, sounds (optional, can stay in Studio)
├── tests/                # TestEZ tests
├── default.project.json  # Rojo configuration
├── wally.toml           # Package manager (optional)
└── README.md
```

## Creating the Project File

Create `default.project.json`:

```json
{
  "name": "HorrorGame",
  "tree": {
    "$className": "DataModel",

    "ReplicatedStorage": {
      "$className": "ReplicatedStorage",
      "Shared": {
        "$path": "src/shared"
      }
    },

    "ServerScriptService": {
      "$className": "ServerScriptService",
      "Server": {
        "$path": "src/server"
      }
    },

    "StarterPlayer": {
      "$className": "StarterPlayer",
      "StarterPlayerScripts": {
        "$className": "StarterPlayerScripts",
        "Client": {
          "$path": "src/client"
        }
      }
    },

    "Lighting": {
      "$className": "Lighting",
      "$properties": {
        "Brightness": 0.5,
        "ClockTime": 0,
        "Ambient": [0.05, 0.05, 0.08],
        "FogEnd": 200,
        "FogColor": [0.1, 0.1, 0.12]
      }
    }
  }
}
```

This tells Rojo:
- Scripts in `src/server/` go to ServerScriptService
- Scripts in `src/client/` go to StarterPlayerScripts
- Scripts in `src/shared/` go to ReplicatedStorage
- Lighting starts dark and foggy (horror defaults)

## Client-Server Architecture

Roblox enforces a client-server model:

**Server** (`src/server/`)
- Runs on Roblox's servers
- Has authority over game state
- Can access datastores
- Scripts end in `.server.luau`

**Client** (`src/client/`)
- Runs on each player's device
- Handles input and UI
- Can be exploited—never trust client data
- Scripts end in `.client.luau`

**Shared** (`src/shared/`)
- Code used by both client and server
- No automatic execution—must be `require()`d
- Great for utility functions and types
- Scripts end in `.luau` (no server/client suffix)

## Your First Scripts

Create `src/server/Init.server.luau`:

```lua
-- Server initialization
print("Server starting...")

-- Game state
local GameState = {
    isNight = true,
    threatLevel = 0,
    playersAlive = 0,
}

-- Wait for players
game.Players.PlayerAdded:Connect(function(player)
    print(player.Name .. " joined")
    GameState.playersAlive += 1
end)

game.Players.PlayerRemoving:Connect(function(player)
    GameState.playersAlive -= 1
end)
```

Create `src/client/Init.client.luau`:

```lua
-- Client initialization
print("Client starting...")

local player = game.Players.LocalPlayer
local playerGui = player:WaitForChild("PlayerGui")

-- Basic horror UI setup
local screenGui = Instance.new("ScreenGui")
screenGui.Name = "HorrorUI"
screenGui.Parent = playerGui
```

Create `src/shared/Config.luau`:

```lua
-- Shared configuration
return {
    -- Player settings
    PLAYER_WALK_SPEED = 12,
    PLAYER_RUN_SPEED = 20,
    PLAYER_MAX_STAMINA = 100,
    STAMINA_DRAIN_RATE = 10,
    STAMINA_REGEN_RATE = 5,

    -- Creature settings
    CREATURE_DETECTION_RADIUS = 50,
    CREATURE_CHASE_SPEED = 18,
    CREATURE_PATROL_SPEED = 8,

    -- World settings
    DAY_LENGTH = 600,  -- seconds
    NIGHT_LENGTH = 300,
}
```

## Running with Rojo

Start the Rojo server:

```bash
rojo serve
```

In Roblox Studio:
1. Open a new place (or your existing place)
2. Go to Plugins → Rojo
3. Click "Connect"
4. Your files now sync automatically

Every time you save a `.luau` file, it appears in Studio instantly.

## Git Setup

Initialize version control:

```bash
git init
echo "*.rbxl" >> .gitignore
echo "*.rbxlx" >> .gitignore
echo ".DS_Store" >> .gitignore
git add .
git commit -m "Initial project setup"
```

The `.rbxl` files are Roblox place files—large binary files that don't version control well. With Rojo, your source of truth is the `src/` directory.

## Vibe Coding the Setup

When setting up a new Roblox project with AI assistance, try prompts like:

> "Create a Rojo project structure for a survival horror game with client-server separation"

> "Add a shared Config module with settings for player movement, stamina, and creature behavior"

> "Set up dark, foggy lighting defaults appropriate for a horror game"

The AI can generate the boilerplate instantly, letting you focus on what makes your game unique.

## Next Steps

With the project structure in place, we can start building the actual game. In the next chapter, we'll create the atmospheric lighting and sound systems that make horror games feel terrifying.
