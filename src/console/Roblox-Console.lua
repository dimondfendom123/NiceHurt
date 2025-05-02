repeat
    task.wait()
until game:IsLoaded()

if _G.NiceHurt then
    return
end

local function generateSessionCode(length)
    local chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
    local result = ""
    for _ = 1, length do
        local index = math.random(1, #chars)
        result = result .. string.sub(chars, index, index)
    end
    return result
end

_G.NiceHurt = true
_G.NiceHurtSession = generateSessionCode(16)

game:GetService("StarterGui"):SetCore(
    "SendNotification",
    {
        Title = "NiceHurt",
        Text = "Injection successful, powered by Sirhurt",
        Icon = "https://sirhurt.net/assets/img/sirhurtlogo.png"
    }
)

local HttpService = game:GetService("HttpService")
local urlConsole = "http://localhost:9292/roblox-console"
local urlSession = "http://localhost:9292/roblox-session"

local lastProcessedIndex = 0

local function sendNotification(message)
    local data = {content = message}
    local newdata = HttpService:JSONEncode(data)
    local headers = {["content-type"] = "application/json"}
    local request = http_request or request or HttpPost or syn.request
    local params = {Url = urlConsole, Body = newdata, Method = "POST", Headers = headers}
    request(params)
end

local function notifySession()
    local payload = {
        session = _G.NiceHurtSession,
        time = os.time(),
        jobId = tostring(game.JobId),
        placeId = tostring(game.PlaceId)
    }
    local body = HttpService:JSONEncode(payload)
    local headers = {["content-type"] = "application/json"}
    local request = http_request or request or HttpPost or syn.request
    local params = {Url = urlSession, Body = body, Method = "POST", Headers = headers}
    request(params)
end

notifySession()

while true do
    local logHistory = game:GetService("LogService"):GetLogHistory()
    for i = lastProcessedIndex + 1, #logHistory do
        local logEntry = logHistory[i]
        sendNotification(logEntry.message)
    end
    lastProcessedIndex = #logHistory
    wait(1)
end
