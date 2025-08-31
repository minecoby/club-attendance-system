import { isMobileDevice } from '../utils/deviceDetection';
import MobileOnlyScreen from './MobileOnlyScreen';

const UserGuard = ({ children }) => {
  const usertype = localStorage.getItem("usertype");
  
  if (usertype === "user" && !isMobileDevice()) {
    return <MobileOnlyScreen />;
  }

  return children;
};

export default UserGuard;