/**
 * Tests for LoadingIndicator component
 */
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import LoadingIndicator from '../../components/LoadingIndicator';

describe('LoadingIndicator', () => {
  it('shows planning message for planning step', () => {
    render(<LoadingIndicator workflowStep="planning" />);
    expect(screen.getByText('Planning structure...')).toBeInTheDocument();
  });

  it('shows coding message for coding step', () => {
    render(<LoadingIndicator workflowStep="coding" />);
    expect(screen.getByText('Generating code...')).toBeInTheDocument();
  });

  it('shows validating message for validating step', () => {
    render(<LoadingIndicator workflowStep="validating" />);
    expect(screen.getByText('Validating model...')).toBeInTheDocument();
  });

  it('shows default thinking message for unknown step', () => {
    render(<LoadingIndicator workflowStep={'unknown' as any} />);
    expect(screen.getByText('Thinking...')).toBeInTheDocument();
  });
});
