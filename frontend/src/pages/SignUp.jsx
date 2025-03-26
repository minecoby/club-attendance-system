import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/SignUp.css';
import hiCat from '../assets/hiCat.jpg';
import lovingYou from '../assets/lovingYou.jpg';

const SignUp = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    userid: '',
    name: '',
    password: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('회원가입 데이터:', formData);

    navigate('/login');

  };

  return (
    <div className="signup-container">
        <div className='img-section'>
            <img src={lovingYou} alt='가입 축하' className='signup-img'/>
        </div>
        <div className='signup-box'>
            <h2 className="signup-title">회원가입</h2>
        
            <form className="signup-form" onSubmit={handleSubmit}>
                <div className="form-field">
                    <label htmlFor="userid" className="form-label">User ID</label>
                    <input
                        type="text"
                        id="userid"
                        name="userid"
                        value={formData.userid}
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
            </form>
            <button type="submit" className="submit-button" onClick={handleSubmit}>회원가입하기</button>
        
        </div>
    </div>
  );
};

export default SignUp;
