import { createBrowserRouter } from 'react-router-dom';
import LoginTraineeV1 from '../pages/LoginTraineeV1';
import LoginTraineeV2 from '../pages/LoginTraineeV2';
import DashboardGlovesConnected from '../pages/DashboardGlovesConnected';
import DashboardLogout from '../pages/DashboardLogout';
import DashboardLogoutConfirm from '../pages/DashboardLogoutConfirm';
import ModulesGrid from '../pages/ModulesGrid';
import Module1Instructions from '../pages/Module1Instructions';
import Module1Exercise1Start from '../pages/Module1Exercise1Start';
import Module1Exercise1Score from '../pages/Module1Exercise1Score';
import Module1Exercise2Start from '../pages/Module1Exercise2Start';
import Module1Exercise2Score from '../pages/Module1Exercise2Score';
import CompletedModule from '../pages/CompletedModule';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <LoginTraineeV1 />,
  },
  {
    path: '/login-trainee-v1',
    element: <LoginTraineeV1 />,
  },
  {
    path: '/login-trainee-v2',
    element: <LoginTraineeV2 />,
  },
  {
    path: '/dashboard',
    element: <DashboardGlovesConnected />,
  },
  {
    path: '/dashboard/logout',
    element: <DashboardLogout />,
  },
  {
    path: '/dashboard/logout/confirm',
    element: <DashboardLogoutConfirm />,
  },
  {
    path: '/modules',
    element: <ModulesGrid />,
  },
  {
    path: '/module/1/instructions',
    element: <Module1Instructions />,
  },
  {
    path: '/module/1/exercise/1/start',
    element: <Module1Exercise1Start />,
  },
  {
    path: '/module/1/exercise/1/score',
    element: <Module1Exercise1Score />,
  },
  {
    path: '/module/1/exercise/2/start',
    element: <Module1Exercise2Start />,
  },
  {
    path: '/module/1/exercise/2/score',
    element: <Module1Exercise2Score />,
  },
  {
    path: '/module/1/completed',
    element: <CompletedModule />,
  },
]);

