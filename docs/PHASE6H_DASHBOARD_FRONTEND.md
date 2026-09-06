# Phase 6H Frontend Architecture

The Dashboard Frontend is built as a Single Page Application (SPA) utilizing Vite, React, and Vanilla CSS. It provides a highly responsive administration portal and a drag-and-resize dashboard builder for the IoT platform.

## Technology Stack
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: `react-router-dom`
- **Charting**: `chart.js` + `react-chartjs-2`
- **Layout Engine**: `react-grid-layout`
- **Icons**: `lucide-react`
- **Network**: `axios`

## Context Architecture
The frontend leverages two distinct authentication contexts to maintain the strict isolation rules established in Phase 6D.

1. **`AuthContext`**: Manages the Platform JWT. It dictates access to global Workspaces and high-level application creation.
2. **`ApplicationAuthContext`**: Manages Application-specific JWTs. It verifies the Phase 6D settings (e.g., `authentication_enabled`) and provides scoped access to the Application Admin pages and private dashboards.

## Component Layout
- `/workspaces`: The global platform dashboard to select organizations/workspaces.
- `/applications/:applicationId/login`: The tailored application portal mimicking the Phase 6D public-facing application login page.
- `/applications/:applicationId/admin`: The internal application management panel to adjust Device Permissions and generate dynamic API keys.
- `/applications/:applicationId/dashboards/:dashboardId/edit`: The `DashboardBuilder` utilizing `react-grid-layout` to map out widgets over a customizable grid.
- `/applications/:applicationId/dashboards/:dashboardId/view`: The `DashboardView` which renders widgets dynamically utilizing the `WidgetRenderer` factory.

## Widget Factory
The `WidgetRenderer` dynamically instantiates widgets based on `widget_type`:
- `STATUS`: Visualizes the `online`/`offline` status from the MQTT broker.
- `SENSOR_VALUE`: Displays a numerical metric with defined units.
- `LINE_CHART` & `BAR_CHART`: Leverages `chart.js` to render historical device telemetry sequentially.
- `TEXT`: Displays static HTML/Markdown notes for the operator.
