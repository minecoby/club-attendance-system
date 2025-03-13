import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav style={{ padding: "10px", background: "#eee" }}>
      <Link to="/userpage" style={{ marginRight: "10px" }}>user페이지</Link>
      <Link to="/settings">설정</Link>
    </nav>
  );
}

export default Navbar;
