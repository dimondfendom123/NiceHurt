# NiceHurt

NiceHurt is a Custom UI for SirHurt, Build in Electron and Node.js. It allows you to execute custom Lua scripts within Roblox, view real-time console output, and manage scripts from a built-in file manager.

## Features

- **Script Execution**: Execute custom Lua scripts within Roblox.
- **Console Output**: View real-time console output from Roblox.
- **File Management**: Manage and execute scripts from a built-in file manager.
- **Custom UI**: User-friendly interface with a Monaco editor for script editing.
- **Error Logging**: Logs errors to a file for debugging purposes.

## Installation

1. **Clone the repository**:

   ```bash
   git clone https://github.com/nici002018/NiceHurt.git
   cd NiceHurt
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Run the application**:
   ```bash
   npm start
   ```

## Usage

1. **Launching the Application**: Run the application using `npm start`. The splash screen will appear, followed by the main application window.
2. **Injecting Scripts**: Use the "Inject" button to inject scripts into Roblox.
3. **Executing Scripts**: Write or open a Lua script in the Monaco editor and click "Execute" to run the script.
4. **Viewing Console Output**: The console output from Roblox will be displayed in the "Console Output" section.

## Project Structure

- **main.js**: Entry point for the Electron application.
- **InjectorController.js**: Handles script injection and execution.
- **console/Controller.js**: Backend server for handling console output.
- **screens/**: Contains HTML, CSS, and JavaScript files for the UI.
- **console/Roblox-Console.lua**: Lua script for capturing Roblox console output.

## License

This project is licensed under the MIT License. See the [LICENSE](./LICENSE) file for details.

## Contributing

Contributions are welcome! Please fork the repository and submit a pull request.

## To-Do (2.0)

- [x] Autoexecute: Add an auto-execute feature for scripts.
- [x] Auto-Check: Check for the game is loaded before executing the scripts.
- [ ] Injector: Fixing the error reading for the injector.
- [ ] SirHurt Cleaner: Add a cleaner for SirHurt to remove files to fix some Problems.
- [x] Settings-Theme: Add a theme system for the application.
- [x] Better UI: Change the UI to a more modern look and better user experience.
- [x] Recode: Recode the application to a better and more optimized version.
- [x] Check SirHurt Updates/Versions: Check for updates and versions of SirHurt.
- [x] Check for Updates: Check for updates of the application.
- [x] Ask for Windows Defender Exclusion: Ask for Windows Defender exclusion for the application.
- [x] Discord Rich Presence: Add Discord Rich Presence for the application.
- [x] Scripthub: Scripthub (RScript.net)

## To-Do (2.1)

- [ ] Custom Themes: Add custom themes for the application.
- [ ] Script Hub: Add other apis (scriptblox, etc.) for the application.
