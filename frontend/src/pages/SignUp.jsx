import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; 
import '../styles/SignUp.css';
import lovingYou from '../assets/lovingYou.jpg';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    user_id: '',
    password: '',
    name: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      await axios.post("http://localhost:8000/users/signin", formData);
      alert("회원가입 완료!");
      navigate('/login');
    } catch (err) {
      console.error("회원가입 실패:", err);
      alert("회원가입에 실패했습니다.");
    }
  };

  return (
    <div className="signup-container">
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
