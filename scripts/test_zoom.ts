import { zoomService } from '../server/services/zoomService.js';

async function main() {
  console.log('Testing Zoom OAuth token...');
  const token = await zoomService.getAccessToken();
  console.log('Token acquired! Starts with:', token.substring(0, 10));

  console.log('Creating live Zoom test meeting...');
  const mtg = await zoomService.createMeeting({
    topic: 'Trade Nexus Live Integration Test',
    type: 2,
    agenda: 'Verifying Zoom API End-to-End Integration',
    duration: 30,
  });
  console.log('Meeting created successfully:');
  console.log('- ID:', mtg.id);
  console.log('- Join URL:', mtg.joinUrl);
  console.log('- Password:', mtg.password);

  console.log('Cleaning up test meeting...');
  const del = await zoomService.deleteMeeting(mtg.id);
  console.log('Deleted successfully:', del);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
