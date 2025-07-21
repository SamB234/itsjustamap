import Navbar from './components/Navbar'
import Map from './components/Map'

export default function App() {
  return (
    <div className="flex flex-col h-screen">
      <Navbar />
      <div className="flex-1 relative">
        <Map />
      </div>
    </div>
  )
}
