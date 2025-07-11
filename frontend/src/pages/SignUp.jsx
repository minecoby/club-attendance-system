import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import '../styles/SignUp.css';
import lovingYou from '../assets/lovingYou.jpg';
import AlertModal from '../components/AlertModal';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    user_id: '',
    password: '',
    name: '',
  });
  const [alert, setAlert] = useState({ show: false, type: 'info', message: '', after: null });

  const API = import.meta.env.VITE_API_BASE_URL;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post(`${API}/users/signin`, formData);
      setAlert({ show: true, type: 'success', message: '회원가입 완료!', after: () => navigate('/login') });
    } catch (err) {
      console.error("회원가입 실패:", err);
      setAlert({ show: true, type: 'error', message: '회원가입에 실패했습니다.', after: null });
    }
  };

  const handleCloseAlert = () => {
    setAlert({ ...alert, show: false });
    if (alert.after) alert.after();
  };

  return (
    <div className="signup-container">
      <AlertModal show={alert.show} type={alert.type} message={alert.message} onClose={handleCloseAlert} />
      <div className='img-section'>
        <img src={lovingYou} alt='가입 축하' className='signup-img' />
      </div>
      <div className='signup-box'>
        <h2 className="signup-title">회원가입</h2>

        <form className="signup-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="user_id" className="form-label">User ID</label>
            <input
              type="text"
              id="user_id"
              name="user_id"
              value={formData.user_id}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="password" className="form-label">비밀번호</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <div className="form-field">
            <label htmlFor="name" className="form-label">이름</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="form-input"
              required
            />
          </div>

          <button type="submit" className="submit-button">회원가입하기</button>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
