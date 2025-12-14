"""
Puzzle Cache System for Fast Game Loading
Pre-generates and caches Sudoku puzzles to eliminate generation delays
"""

import json
import os
import threading
import time
from typing import List, Tuple, Dict
from collections import deque
from Sudoko_backend import SudokuGame

Grid = List[List[int]]

class PuzzleCache:
    """
    Maintains a pool of pre-generated puzzles for each difficulty level.
    Automatically refills the pool in the background.
    """
    
    def __init__(self, pool_size: int = 10, cache_file: str = "puzzle_cache.json"):
        """
        Initialize the puzzle cache.
        
        Args:
            pool_size: Number of puzzles to keep cached per difficulty
            cache_file: Path to persistent cache file
        """
        self.pool_size = pool_size
        self.cache_file = cache_file
        self.difficulties = ["easy", "medium", "hard", "expert"]
        
        # In-memory puzzle pools (FIFO queues)
        self.pools: Dict[str, deque] = {
            diff: deque(maxlen=pool_size) for diff in self.difficulties
        }
        
        # Lock for thread-safe access
        self.lock = threading.Lock()
        
        # Background generation thread
        self.generation_thread = None
        self.should_stop = False
        
        # Load cached puzzles from disk
        self._load_cache()
        
        # Start background generation
        self._start_background_generation()
    
    def _load_cache(self):
        """Load cached puzzles from disk if available."""
        if not os.path.exists(self.cache_file):
            return
        
        try:
            with open(self.cache_file, 'r') as f:
                data = json.load(f)
            
            with self.lock:
                for diff in self.difficulties:
                    if diff in data:
                        puzzles = data[diff]
                        for item in puzzles[:self.pool_size]:
                            self.pools[diff].append((item['puzzle'], item['solution']))
            
            print(f"✅ Loaded {sum(len(pool) for pool in self.pools.values())} cached puzzles from disk")
        except Exception as e:
            print(f"⚠️ Failed to load puzzle cache: {e}")
    
    def _save_cache(self):
        """Save current puzzle pools to disk."""
        try:
            data = {}
            with self.lock:
                for diff in self.difficulties:
                    data[diff] = [
                        {"puzzle": puzzle, "solution": solution}
                        for puzzle, solution in list(self.pools[diff])
                    ]
            
            with open(self.cache_file, 'w') as f:
                json.dump(data, f)
            
            print(f"💾 Saved {sum(len(pool) for pool in self.pools.values())} puzzles to cache")
        except Exception as e:
            print(f"⚠️ Failed to save puzzle cache: {e}")
    
    def _generate_puzzle(self, difficulty: str) -> Tuple[Grid, Grid]:
        """Generate a single puzzle for the given difficulty."""
        game = SudokuGame()
        puzzle, solution = game.new_game(difficulty)
        return puzzle, solution
    
    def _background_generator(self):
        """Background thread that keeps puzzle pools filled."""
        print("🔄 Background puzzle generator started")
        
        while not self.should_stop:
            # Check each difficulty pool and refill if needed
            for diff in self.difficulties:
                if self.should_stop:
                    break
                
                with self.lock:
                    current_size = len(self.pools[diff])
                
                # If pool is below target, generate more
                if current_size < self.pool_size:
                    try:
                        puzzle, solution = self._generate_puzzle(diff)
                        
                        with self.lock:
                            self.pools[diff].append((puzzle, solution))
                        
                        print(f"✨ Generated {diff} puzzle ({len(self.pools[diff])}/{self.pool_size})")
                    except Exception as e:
                        print(f"❌ Failed to generate {diff} puzzle: {e}")
            
            # Save cache periodically
            self._save_cache()
            
            # Sleep briefly before next check
            time.sleep(1)
        
        print("🛑 Background puzzle generator stopped")
    
    def _start_background_generation(self):
        """Start the background generation thread."""
        if self.generation_thread is None or not self.generation_thread.is_alive():
            self.should_stop = False
            self.generation_thread = threading.Thread(
                target=self._background_generator,
                daemon=True
            )
            self.generation_thread.start()
    
    def get_puzzle(self, difficulty: str) -> Tuple[Grid, Grid]:
        """
        Get a puzzle from the cache. If cache is empty, generate one immediately.
        
        Args:
            difficulty: Difficulty level (easy, medium, hard, expert)
        
        Returns:
            Tuple of (puzzle, solution)
        """
        difficulty = difficulty.lower()
        if difficulty not in self.difficulties:
            difficulty = "medium"
        
        with self.lock:
            if len(self.pools[difficulty]) > 0:
                # Get from cache
                puzzle, solution = self.pools[difficulty].popleft()
                print(f"⚡ Served {difficulty} puzzle from cache ({len(self.pools[difficulty])} remaining)")
                return puzzle, solution
        
        # Cache is empty, generate immediately
        print(f"⏳ Cache empty, generating {difficulty} puzzle...")
        puzzle, solution = self._generate_puzzle(difficulty)
        return puzzle, solution
    
    def prefill_cache(self, count_per_difficulty: int = None):
        """
        Synchronously fill the cache with puzzles.
        Useful for initial setup.
        
        Args:
            count_per_difficulty: Number of puzzles to generate per difficulty
                                 (defaults to pool_size)
        """
        if count_per_difficulty is None:
            count_per_difficulty = self.pool_size
        
        print(f"🔧 Pre-filling cache with {count_per_difficulty} puzzles per difficulty...")
        
        for diff in self.difficulties:
            for i in range(count_per_difficulty):
                try:
                    puzzle, solution = self._generate_puzzle(diff)
                    with self.lock:
                        self.pools[diff].append((puzzle, solution))
                    print(f"  ✓ {diff}: {i+1}/{count_per_difficulty}")
                except Exception as e:
                    print(f"  ✗ {diff}: Failed - {e}")
        
        self._save_cache()
        print("✅ Cache pre-fill complete!")
    
    def get_stats(self) -> Dict[str, int]:
        """Get current cache statistics."""
        with self.lock:
            return {diff: len(self.pools[diff]) for diff in self.difficulties}
    
    def shutdown(self):
        """Gracefully shutdown the cache system."""
        print("🛑 Shutting down puzzle cache...")
        self.should_stop = True
        if self.generation_thread:
            self.generation_thread.join(timeout=5)
        self._save_cache()
        print("✅ Puzzle cache shutdown complete")


# Global cache instance
_global_cache = None

def get_cache() -> PuzzleCache:
    """Get or create the global puzzle cache instance."""
    global _global_cache
    if _global_cache is None:
        _global_cache = PuzzleCache(pool_size=5)  # Keep 5 puzzles per difficulty
    return _global_cache
