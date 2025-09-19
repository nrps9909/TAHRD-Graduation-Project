import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'

// Simple component for testing
function TestComponent() {
  return <div>Hello Test</div>
}

describe('Example Test', () => {
  it('should render test component', () => {
    render(<TestComponent />)
    expect(screen.getByText('Hello Test')).toBeInTheDocument()
  })

  it('should perform basic arithmetic', () => {
    expect(2 + 2).toBe(4)
  })
})
