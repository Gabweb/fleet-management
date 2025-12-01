export const possiblePermissionsForUser: Record<string, string[]> = {
    Alexa: ["*", "Disable", "Enable"],
    Device: ["*", "list", "GetInfo", "GetSetup", "Call", "Get"],
    Entity: ["*", "GetInfo", "List"],
    FleetManager: ["*", "GerVariables", "Subscribe", "Unsubscribe", "ListPlugins", "UploadPlugin", "ListCommands"],
    GrafanaComponent: ["*", "GetConfig", "GetDashboard"],
    GroupComponents: ["*", "Create", "Add", "Remove", "List", "Get", "Delete", "Rename", "Set", "Find"],
    Group: ["*", "list", "delete", "view"],
    MailComponent: ["Send"],
    StorageComponent: ["*", "GetItem", "SetItem", "RemoveItem", "Keys", "GetAll"],
    UserComponents: ["*", "Create", "Update", "Delete", "List", "Refresh", "Authenticate"],
    WaitingRoomComponents: ["*", "GetPending", "GetDenied", "AcceptPending", "RejectPending"],
    Permissions: ["*", "List", "Delete", "View"],
};