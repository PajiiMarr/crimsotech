import { Link } from 'react-router';

export function Header() {
    return (
        <header className="text-lg sticky top-0 flex justify-between p-3">
            <div className='p-3 flex gap-2'>
                <Link to="/" className='p-3 font-bold'><h1>Logo Placeholder</h1></Link>
                <Link to="/" className='hover:text-orange-500 p-3'>CrimsoTech</Link>
                <Link to="/about" className='hover:text-orange-500 p-3'>About us</Link>
                <Link to="/" className='hover:text-orange-500 p-3'>Services</Link>
                <Link to="/" className='hover:text-orange-500 p-3'>Volunteer</Link>
                <Link to="/riders" className='hover:text-orange-500 p-3'>Be a Rider</Link>
            </div>
            <div className='p-3'>
                <Link to="/login">
                    <p className='hover:text-orange-100'>Shop Now</p>
                </Link>
            </div>
        </header>
    )
}