import { Link } from 'react-router-dom'

function SignIn() {
  return (
    <div>
      <h1>Sign In</h1>
      <p>Sign in page</p>
      <Link to="/">
        <button>Back to Welcome</button>
      </Link>
    </div>
  )
}

export default SignIn