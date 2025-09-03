import React from 'react';

export const AppContext = React.createContext({
  exercises: [],
  muscleGroups: [],
  subcategories: [],
  userId: null,
  db: null,
  appId: null,
  auth: null,
  user: null,
});