import AssemblyEditor from '../components/AssemblyEditor';

export default function Home() {
  return (
    <main className="flex min-h-screen bg-gray-950">
      {/* Left Column: The Monaco Editor */}
      <div className="w-1/2 border-r border-gray-700">
        <AssemblyEditor />
      </div>

      {/* Right Column: The Future Visualizer */}
      <div className="w-1/2 p-8 text-white">
        <h1 className="text-2xl font-bold mb-4">CPU State (Coming Soon)</h1>
        <p className="text-gray-400">
          This is where we will render the Accumulator, Registers, and RAM 
          based on the WebAssembly emulator output.
        </p>
      </div>
    </main>
  );
}