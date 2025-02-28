# Task Management App - TaskMe

TaskMe is a task management application built with React, TypeScript, and Vite. It allows users to create, update, delete, and filter tasks based on various criteria such as status, category, and priority.

## Features

- Add, update, and delete tasks
- Filter tasks by status, category, priority, and search term
- Mark tasks as completed or active
- Persistent storage using localStorage
- Responsive design
- Quick add task functionality
- Dashboard with task statistics

## Getting Started

### Prerequisites

Make sure you have the following installed on your machine:

- [Node.js](https://nodejs.org/) (version 14 or higher)
- [npm](https://www.npmjs.com/) or [yarn](https://yarnpkg.com/)

### Installation

1. Clone the repository:

```sh
git clone https://github.com/your-username/task_management_taskMe.git
cd task_management_taskMe
```

2. Install the dependencies:

```sh
npm install
# or
yarn install
```

### Running the App

To start the development server, run:

```sh
npm run dev
# or
yarn dev
```

This will start the Vite development server and you can view the app in your browser at `http://localhost:3000`.

### Building for Production

To build the app for production, run:

```sh
npm run build
# or
yarn build
```

This will create an optimized production build in the `dist` directory.

### Linting

To lint the code, run:

```sh
npm run lint
# or
yarn lint
```

### Formatting

To format the code, run:

```sh
npm run format
# or
yarn format
```

## Expanding the ESLint Configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

- Configure the top-level `parserOptions` property like this:

```js
export default tseslint.config({
  languageOptions: {
    // other options...
    parserOptions: {
      project: ["./tsconfig.node.json", "./tsconfig.app.json"],
      tsconfigRootDir: import.meta.dirname,
    },
  },
});
```

- Replace `tseslint.configs.recommended` with `tseslint.configs.recommendedTypeChecked` or `tseslint.configs.strictTypeChecked`
- Optionally add `...tseslint.configs.stylisticTypeChecked`
- Install [eslint-plugin-react](https://github.com/jsx-eslint/eslint-plugin-react) and update the config:

```js
// eslint.config.js
import react from "eslint-plugin-react";

export default tseslint.config({
  // Set the react version
  settings: { react: { version: "18.3" } },
  plugins: {
    // Add the react plugin
    react,
  },
  rules: {
    // other rules...
    // Enable its recommended rules
    ...react.configs.recommended.rules,
    ...react.configs["jsx-runtime"].rules,
  },
});
```
