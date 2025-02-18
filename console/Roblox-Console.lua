repeat task.wait() until game:IsLoaded()

if _G.NiceHurt then
    return
end

_G.NiceHurt = true

game:GetService("StarterGui"):SetCore("SendNotification", {
    Title = "NiceHurt",
    Text = "Injection successful, powered by Sirhurt",
    Icon = "https://sirhurt.net/assets/img/sirhurtlogo.png"
})

local url = "http://localhost:9292/roblox-console"

local lastProcessedIndex = 0

local function sendNotification(message)
    local data = { content = message }
    local newdata = game:GetService("HttpService"):JSONEncode(data)
    local headers = { ["content-type"] = "application/json" }
    local request = http_request or request or HttpPost or syn.request
    local params = { Url = url, Body = newdata, Method = "POST", Headers = headers }
    request(params)
end

while true do
    local logHistory = game:GetService("LogService"):GetLogHistory()
    for i = lastProcessedIndex + 1, #logHistory do
        local logEntry = logHistory[i]
        sendNotification(logEntry.message)
    end
    lastProcessedIndex = #logHistory
    wait(1)
end