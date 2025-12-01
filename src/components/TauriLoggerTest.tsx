import { useEffect } from "react";
import tauriLogger from "@/lib/tauri-logger";

const TauriLoggerTest = () => {
  useEffect(() => {
    const testLogging = async () => {
      console.log("Testing Tauri logger...");
      
      // Test all log levels
      await tauriLogger.debug("This is a debug message from TauriLoggerTest");
      await tauriLogger.info("This is an info message from TauriLoggerTest");
      await tauriLogger.warn("This is a warning message from TauriLoggerTest");
      await tauriLogger.error("This is an error message from TauriLoggerTest");
      
      // Test with more complex messages
      await tauriLogger.info("Component mounted successfully");
      await tauriLogger.warn("This is a warning with more details");
      await tauriLogger.error("This is an error with more details");
      
      // Test the built-in test function
      await tauriLogger.test();
    };
    
    testLogging();
  }, []);

  return (
    <div className="p-4 bg-green-100 rounded-lg m-4">
      <h2 className="text-lg font-bold">Tauri Logger Test Component</h2>
      <p className="text-sm text-gray-600">
        This component tests the Tauri-based logger functionality.
        Check the Tauri console to see the output.
      </p>
    </div>
  );
};

export default TauriLoggerTest;