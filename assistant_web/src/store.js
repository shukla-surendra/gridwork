import { configureStore } from '@reduxjs/toolkit'
import taskReducer from './slices/tasks';
import userReducer from './slices/users';
import workspaceReducer from './slices/workspaces';
import authReducer from './slices/auth';
import settingsReducer from './slices/settings';
import contactsReducer from './slices/crm/contactsSlice';
import dealsReducer from './slices/crm/dealsSlice';
import companiesReducer from './slices/crm/companiesSlice';
import activitiesReducer from './slices/crm/activitiesSlice';
import chatReducer from './slices/chatSlice';
import boardsReducer from './slices/boards';
import pagesReducer from './slices/pages';
import remindersReducer from './slices/reminders';
import databasesReducer from './slices/databases';
import reportsReducer from './slices/reports';
import notificationsReducer from './slices/notifications';
import epicsReducer from './slices/epics';
import sprintsReducer from './slices/sprints';
import workspaceActivityReducer from './slices/workspaceActivity';
import hrReducer from './slices/hr';
import modulesReducer from './slices/modules';

const store = configureStore({
  reducer: {
    tasks: taskReducer,
    users: userReducer,
    workspaces: workspaceReducer,
    auth: authReducer,
    settings: settingsReducer,
    contacts: contactsReducer,
    deals: dealsReducer,
    companies: companiesReducer,
    activities: activitiesReducer,
    chat: chatReducer,
    boards: boardsReducer,
    pages: pagesReducer,
    reminders: remindersReducer,
    databases: databasesReducer,
    reports: reportsReducer,
    notifications: notificationsReducer,
    epics: epicsReducer,
    sprints: sprintsReducer,
    workspaceActivity: workspaceActivityReducer,
    hr: hrReducer,
    modules: modulesReducer
  },
  devTools: true,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export default store;