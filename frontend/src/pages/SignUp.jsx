import React, { useState } from 'react';
import '../styles/SignUp.css';

const SignUp = () => {
  const [formData, setFormData] = useState({
    userid: '',
    name: '',
    password: '',
    isAdmin: false,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'isAdmin') {
      setFormData({ ...formData, isAdmin: value === 'true' });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('회원가입 데이터:', formData);
    // TODO: 백엔드로 데이터 전송 로직 추가
  };

  return (
    <div className="signup-section">
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

            <div className="form-field">
            <label className="form-label">역할</label>
            <div className="radio-options">
                <label className="radio-label">
                <input
                    type="radio"
                    name="isAdmin"
                    value="true"
                    checked={formData.isAdmin === true}
                    onChange={handleChange}
                />
                리더
                </label>
                <label className="radio-label">
                    <input
                        type="radio"
                        name="isAdmin"
                        value="false"
                        checked={formData.isAdmin === false}
                        onChange={handleChange}
                    />
                팀원
                </label>
            </div>
            </div>
            <button type="submit" className="submit-button">회원가입</button>
            </form>

        </div>
    </div>
  );
};

export default SignUp;
