import { createBrowserRouter } from 'react-router-dom';
import LoginTraineeV1 from '../pages/LoginTraineeV1';
import Settings from '../pages/SettingsPage';
import DashboardGlovesConnected from '../pages/DashboardGlovesConnected';
import DashboardLogout from '../pages/DashboardLogout';
import DashboardLogoutConfirm from '../pages/DashboardLogoutConfirm';
import ModulesGrid from '../pages/ModulesGrid';
import Module1Instructions from '../pages/Module1Instructions';
import Module1Exercise1Score from '../pages/Module1Exercise1Score';
import Module1Exercise2Score from '../pages/Module1Exercise2Score';
import ThreeDModule1 from '../pages/3DModule1';
import Module2Instructions from '../pages/Module2Instructions';
import Module3Instructions from '../pages/Module3Instructions';
import CompletedModule from '../pages/CompletedModule';
import PegTransfer from '../pages/PegTransfer';
import CameraControl from '../pages/cameraControl/CameraControl';
import IncompleteModule1 from '../pages/IncompleteModule1';
import IncompleteModule2 from '../pages/IncompleteModule2';
import CompleteModule2 from '../pages/CompleteModule2';
import Module3Completed from '../pages/Module3Completed';
import Module3Incomplete from '../pages/Module3Incomplete';
import Module1Analytics from '../pages/Module1Analytics';
import Module2Analytics from '../pages/Module2Analytics';
import Module3Analytics from '../pages/Module3Analytics';
import AdminDashboard from '../pages/AdminDashboard';
import AdminAnalytics from '../pages/AdminAnalytics';
import TrainerDashboard from '../pages/TrainerDashboard';
import TraineeRegistration from '../pages/TraineeRegistration';
import TrainerRegistration from '../pages/TrainerRegistration';
import HapticsDebug from '../pages/HapticsDebug';

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
    path: '/settings',
    element: <Settings />,
  },
  {
    path: '/dashboard',
    element: <DashboardGlovesConnected />,
  },
  {
    path: '/admin/dashboard',
    element: <AdminDashboard />,
  },
  {
    path: '/admin/trainees',
    element: <TrainerDashboard />,
  },
  {
    path: '/admin/analytics',
    element: <AdminAnalytics />,
  },
  {
    path: '/register/trainee/:token',
    element: <TraineeRegistration />,
  },
  {
    path: '/register/trainer/:token',
    element: <TrainerRegistration />,
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
    path: '/analytics',
    element: <Module1Analytics />,
  },
  {
    path: '/analytics/module2',
    element: <Module2Analytics />,
  },
  {
    path: '/analytics/module3',
    element: <Module3Analytics />,
  },
  {
    path: '/module/1/instructions',
    element: <Module1Instructions />,
  },
  {
    path: '/module/2/instructions',
    element: <Module2Instructions />,
  },
  {
    path: '/module/3/instructions',
    element: <Module3Instructions />,
  },
  {
    path: '/module/1/exercise/1/start',
    element: <ThreeDModule1 />,
  },
  {
    path: '/module/1/exercise/1/score',
    element: <Module1Exercise1Score />,
  },
  {
    path: '/module/1/exercise/2/score',
    element: <Module1Exercise2Score />,
  },
  {
    path: '/module/1/completed',
    element: <CompletedModule />,
  },
  {
    path: '/module/1/incomplete',
    element: <IncompleteModule1 />,
  },
  {
    path: '/module/2/camera-control',
    element: <CameraControl />,
  },
  {
    path: '/module/2/incomplete',
    element: <IncompleteModule2 />,
  },
  {
    path: '/module/2/complete',
    element: <CompleteModule2 />,
  },
  {
    path: '/module/3/peg-transfer',
    element: <PegTransfer />,
  },
  {
    path: '/module/3/completed',
    element: <Module3Completed />,
  },
  {
    path: '/module/3/incomplete',
    element: <Module3Incomplete />,
  },
  {
    path: '/haptics-debug',
    element: <HapticsDebug />,
  },
]);

