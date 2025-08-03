// src/hooks/useAuth.js
import { useSelector, useDispatch } from 'react-redux';
import { logoutSuccess } from '../store/authSlice';

export const useAuth = () => {
  const { isAuthenticated, user, token } = useSelector((state) => state.auth);
  const dispatch = useDispatch();

  const logout = () => {
    dispatch(logoutSuccess());
  };

  return {
    isAuthenticated,
    user,
    token,
    logout,
  };
};

export default useAuth;
