export default function WaveDivider({ fill = '#ffffff', flip = false, className = '' }) {
  return (
    <div className={`pointer-events-none w-full overflow-hidden leading-[0] ${flip ? 'rotate-180' : ''} ${className}`}>
      <svg viewBox="0 0 1200 80" preserveAspectRatio="none" className="h-14 w-full sm:h-20">
        <path
          d="M0,32 C150,80 350,0 600,32 C850,64 1050,8 1200,32 L1200,80 L0,80 Z"
          fill={fill}
        />
      </svg>
    </div>
  );
}
