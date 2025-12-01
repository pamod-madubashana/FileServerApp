import { useEffect } from "react";
import logger from "@/lib/logger";

const LoggerTest = () => {
  useEffect(() => {
    logger.info("LoggerTest component mounted");
    
    // Test all log levels
    logger.debug("This is a debug message from LoggerTest");
    logger.info("This is an info message from LoggerTest");
    logger.warn("This is a warning message from LoggerTest");
    logger.error("This is an error message from LoggerTest");
    
    // Test with data
    logger.info("Testing logger with data", { 
      userId: 123, 
      username: "testuser",
      timestamp: new Date().toISOString()
    });
    
    // Test async logging
    const testAsyncLogging = async () => {
      logger.info("Starting async logging test");
      await new Promise(resolve => setTimeout(resolve, 100));
      logger.info("Async logging test completed");
    };
    
    testAsyncLogging();
  }, []);

  return (
    <div className="p-4 bg-blue-100 rounded-lg m-4">
      <h2 className="text-lg font-bold">Logger Test Component</h2>
      <p className="text-sm text-gray-600">
        This component is used to test the logger functionality.
        Check the console and Tauri logs to see the output.
      </p>
    </div>
  );
};

export default LoggerTest;