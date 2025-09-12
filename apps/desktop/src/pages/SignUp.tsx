import { Link } from 'react-router-dom'

function SignUp() {
  return (
    <div>
      <h1>Sign Up</h1>
      <p>Sign up page</p>
      <Link to="/">
        <button>Back to Welcome</button>
      </Link>
    </div>
  )
}

export default SignUp