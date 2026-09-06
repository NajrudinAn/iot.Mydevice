#ifndef IOT_CONNECTOR_H
#define IOT_CONNECTOR_H

/*
 * ==============================================================================
 * BACKWARD COMPATIBILITY HEADER
 * ==============================================================================
 * This header ensures that existing Arduino sketches using <IoTConnector.h>
 * continue to compile and work seamlessly.
 * 
 * New projects should `#include <MyDeviceSite.h>` directly.
 * ==============================================================================
 */

#include "MyDeviceSite.h"

typedef MyDeviceSite IoTConnector;
typedef MyDeviceConfig IoTConnectorConfig;

// Provide a macro or typedef for the old CommandCallback if they explicitly named it
typedef MyDeviceSite::CommandHandler CommandCallback;

#endif
